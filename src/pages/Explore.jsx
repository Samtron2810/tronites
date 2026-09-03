import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import MainLayout from "../layouts/MainLayout";
import UserCardSkeleton from "../components/UserCardSkeleton";
import PostCard from "../components/PostCard";
import VerifiedBadge from "../components/VerifiedBadge";
import PostSkeleton from "../components/PostSkeleton";
import CommentSearchResultCard from "../components/CommentSearchResultCard";
import MessageSearchResultCard from "../components/MessageSearchResultCard";
import SearchFiltersModal from "../components/SearchFiltersModal";
import SearchHistoryPanel from "../components/SearchHistoryPanel";
import TrendingHashtagsWidget from "../components/TrendingHashtagsWidget";
import api from "../services/api";
import { useRefetchOnFocus } from "../hooks/useRefetchOnFocus";
import { useAuth } from "../context/useAuth";
import { useSocket } from "../context/useSocket";
import { FiSearch, FiHash, FiSliders, FiStar, FiChevronDown, FiCheck } from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";

const EMPTY_FILTERS = { from: "", startDate: "", endDate: "", hasMedia: null, minLikes: "" };

// The four searchable surfaces share one dropdown on the Explore header —
// People is the default state — while Trending stays as its own tab button
// beside it.
const SEARCH_TYPE_OPTIONS = [
  { value: "users", label: "People" },
  { value: "posts", label: "Posts" },
  { value: "comments", label: "Comments" },
  { value: "messages", label: "Messages" },
];

// Any filter set beyond the empty defaults - used to (a) decide whether
// a query-less search is still worth running, and (b) show the active
// filter count badge on the filter button.
const countActiveFilters = (f) =>
  Object.entries(f).filter(([k, v]) => {
    if (k === "hasMedia") return v !== null;
    return String(v || "").trim().length > 0;
  }).length;

const Explore = () => {
  const { user: currentUser } = useAuth();
  const { onlineUsers } = useSocket();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTabState] = useState(
    searchParams.get("tab") || "users",
  ); // "users" | "posts" | "comments" | "messages" | "trending"
  const [search, setSearchState] = useState(searchParams.get("q") || "");

  // Keeps ?tab=&q= in sync with state so Back/forward restores exactly
  // what the user had open, instead of resetting to the users tab and
  // refetching. replace: true — tab/query changes aren't separate
  // history entries a user would want to step back through one at a
  // time.
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };
  const setSearch = (value) => {
    setSearchState(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("q", value);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  };

  // Which searchable surface the dropdown shows. Kept separate from
  // activeTab so switching to Trending doesn't reset the label back to
  // People — the label only ever holds one of the four
  // SEARCH_TYPE_OPTIONS values (People is the default when the URL
  // points at trending or nothing at all).
  const [searchType, setSearchType] = useState(() => {
    const urlTab = searchParams.get("tab");
    return SEARCH_TYPE_OPTIONS.some((t) => t.value === urlTab)
      ? urlTab
      : "users";
  });
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchTriggerRef = useRef(null);
  const searchMenuRef = useRef(null);

  // Close the search-type dropdown on outside click (UserMenu's pattern).
  useEffect(() => {
    if (!searchDropdownOpen) return;
    const handleClickOutside = (event) => {
      if (
        searchMenuRef.current &&
        !searchMenuRef.current.contains(event.target) &&
        searchTriggerRef.current &&
        !searchTriggerRef.current.contains(event.target)
      ) {
        setSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchDropdownOpen]);

  const handleSearchTypeChange = (value) => {
    setSearchType(value);
    setSearchDropdownOpen(false);
    setActiveTab(value);
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [followingId, setFollowingId] = useState(null);
  const observerTarget = useRef(null);

  // Filters - shared draft applies to posts/comments/messages tabs
  // (users search has no filter surface). Kept in one object so
  // Apply/Clear/save-search logic doesn't need per-tab duplication.
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const activeFilterCount = countActiveFilters(filters);

  // Search bar focus drives whether the history/saved panel shows -
  // it only makes sense to show "past searches" when the box is
  // focused and there's no query typed yet.
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

  // Separate state for post-content search - keeps the two tabs from
  // stepping on each other's pagination/loading state when switching.
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsIsLoadingMore, setPostsIsLoadingMore] = useState(false);
  const [postsCursor, setPostsCursor] = useState(null); // { afterScore, afterId } | null
  const [postsHasMore, setPostsHasMore] = useState(false);
  const postsObserverTarget = useRef(null);

  // Comment-content search - own state/cursor, same shape as posts.
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsIsLoadingMore, setCommentsIsLoadingMore] = useState(false);
  const [commentsCursor, setCommentsCursor] = useState(null);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const commentsObserverTarget = useRef(null);

  // Message search - scoped server-side to the caller's own threads.
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesIsLoadingMore, setMessagesIsLoadingMore] = useState(false);
  const [messagesCursor, setMessagesCursor] = useState(null); // { afterTime, afterId } | null
  const [messagesHasMore, setMessagesHasMore] = useState(false);
  const messagesObserverTarget = useRef(null);

  // Trending - moved here from Home (see tab-architecture.html: For You
  // absorbs Trending as a weighted source on Home, and the standalone
  // "what's big right now" surface belongs in Explore's discovery
  // context instead). Own state, own cursor shape (score+id, decays
  // between requests, so it also tracks delivered ids to hard-exclude
  // re-served posts - same reasoning the old Home tab used).
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingIsLoadingMore, setTrendingIsLoadingMore] = useState(false);
  const [trendingCursor, setTrendingCursor] = useState(null); // { afterScore, afterId } | null
  const [trendingHasMore, setTrendingHasMore] = useState(false);
  const [trendingLoaded, setTrendingLoaded] = useState(false);
  const trendingObserverTarget = useRef(null);
  const trendingPostsRef = useRef(trendingPosts);
  useEffect(() => {
    trendingPostsRef.current = trendingPosts;
  }, [trendingPosts]);

  // A query starting with # is unambiguously a hashtag lookup - offer a
  // direct jump to that hashtag's dedicated page instead of (or in
  // addition to) a content-search match.
  const hashtagMatch = search.trim().match(/^#?([a-z0-9_]{2,})$/i);
  const possibleHashtag =
    activeTab === "posts" && hashtagMatch
      ? hashtagMatch[1].toLowerCase()
      : null;

  // Turns the shared `filters` draft into query params for posts/
  // comments/messages searches - same key names the backend's
  // parseSearchFilters expects.
  const filterParams = () => ({
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.startDate ? { startDate: filters.startDate } : {}),
    ...(filters.endDate ? { endDate: filters.endDate } : {}),
    ...(filters.hasMedia !== null ? { hasMedia: filters.hasMedia } : {}),
    ...(filters.minLikes ? { minLikes: filters.minLikes } : {}),
  });

  const fetchPosts = async (query, afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setPostsLoading(true);
      else setPostsIsLoadingMore(true);

      const params = {
        q: query,
        limit: 10,
        ...filterParams(),
        ...(afterCursor
          ? { afterScore: afterCursor.afterScore, afterId: afterCursor.afterId }
          : {}),
      };
      const res = isFirstPage
        ? await api.getCached("/posts/search", { params, ttlMs: 60_000, revalidate: true })
        : await api.get("/posts/search", { params });

      if (isFirstPage) setPosts(res.data.posts);
      else setPosts((prev) => [...prev, ...res.data.posts]);

      setPostsHasMore(res.data.hasMore);
      setPostsCursor(res.data.nextCursor);
    } catch (e) {
      console.error(e);
      if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
    } finally {
      if (isFirstPage) setPostsLoading(false);
      else setPostsIsLoadingMore(false);
    }
  };

  const fetchComments = async (query, afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setCommentsLoading(true);
      else setCommentsIsLoadingMore(true);

      const res = await api.get(`/comments/search`, {
        params: {
          q: query,
          limit: 10,
          ...filterParams(),
          ...(afterCursor
            ? { afterScore: afterCursor.afterScore, afterId: afterCursor.afterId }
            : {}),
        },
      });

      if (isFirstPage) setComments(res.data.comments);
      else setComments((prev) => [...prev, ...res.data.comments]);

      setCommentsHasMore(res.data.hasMore);
      setCommentsCursor(res.data.nextCursor);
    } catch (e) {
      console.error(e);
      if (!isFirstPage) toast.error("Couldn't load more comments. Try again.");
    } finally {
      if (isFirstPage) setCommentsLoading(false);
      else setCommentsIsLoadingMore(false);
    }
  };

  const fetchMessages = async (query, afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setMessagesLoading(true);
      else setMessagesIsLoadingMore(true);

      const res = await api.get(`/messages/search`, {
        params: {
          q: query,
          limit: 15,
          ...filterParams(),
          ...(afterCursor
            ? { afterTime: afterCursor.afterTime, afterId: afterCursor.afterId }
            : {}),
        },
      });

      if (isFirstPage) setMessages(res.data.messages);
      else setMessages((prev) => [...prev, ...res.data.messages]);

      setMessagesHasMore(res.data.hasMore);
      setMessagesCursor(res.data.nextCursor);
    } catch (e) {
      console.error(e);
      if (!isFirstPage) toast.error("Couldn't load more messages. Try again.");
    } finally {
      if (isFirstPage) setMessagesLoading(false);
      else setMessagesIsLoadingMore(false);
    }
  };

  const fetchUsers = async (query, pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const params = { q: query, page: pageNum, limit: 10 };
      const res =
        pageNum === 1
          ? await api.getCached("/users/search", { params, ttlMs: 60_000, revalidate: true })
          : await api.get("/users/search", { params });

      if (pageNum === 1) setUsers(res.data.users);
      else setUsers((prev) => [...prev, ...res.data.users]);

      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (e) {
      console.error(e);
      if (pageNum > 1) toast.error("Couldn't load more users. Try again.");
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  };

  const fetchTrending = async (afterCursor, isFirstPage) => {
    try {
      if (isFirstPage) setTrendingLoading(true);
      else setTrendingIsLoadingMore(true);

      const params = {
        limit: 10,
        ...(afterCursor
          ? {
              afterScore: afterCursor.afterScore,
              afterId: afterCursor.afterId,
              // Hard-exclude posts already delivered - a post's score
              // decays with age between requests, so without this a
              // post can drop below the page-1 cursor and get
              // re-served on page 2.
              excludeIds: trendingPostsRef.current.map((p) => p._id).join(","),
            }
          : {}),
      };
      const res = isFirstPage
        ? await api.getCached("/posts/trending", { params, ttlMs: 60_000, revalidate: true })
        : await api.get("/posts/trending", { params });

      if (isFirstPage) setTrendingPosts(res.data.posts);
      else {
        setTrendingPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p._id));
          return [...prev, ...res.data.posts.filter((p) => !existingIds.has(p._id))];
        });
      }
      setTrendingHasMore(res.data.hasMore);
      setTrendingCursor(res.data.nextCursor);
      setTrendingLoaded(true);
    } catch (e) {
      console.error(e);
      if (!isFirstPage) toast.error("Couldn't load more posts. Try again.");
    } finally {
      if (isFirstPage) setTrendingLoading(false);
      else setTrendingIsLoadingMore(false);
    }
  };

  // History/saved searches - loaded once per tab switch (not on every
  // keystroke), scoped to the current tab so switching tabs shows the
  // right list.
  const loadHistoryAndSaved = useCallback(async (scope) => {
    try {
      const [historyRes, savedRes] = await Promise.all([
        api.get("/search/history", { params: { scope } }),
        api.get("/search/saved", { params: { scope } }),
      ]);
      setHistory(historyRes.data.history);
      setSavedSearches(savedRes.data.savedSearches);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!["posts", "comments", "messages"].includes(activeTab)) return;
    loadHistoryAndSaved(activeTab);
  }, [activeTab, loadHistoryAndSaved]);

  // Debounced history logging - fires a bit after fetch, not on every
  // keystroke, and only for searches that actually returned results
  // worth remembering.
  const logHistoryTimer = useRef(null);
  const logHistory = (scope, query) => {
    if (logHistoryTimer.current) window.clearTimeout(logHistoryTimer.current);
    logHistoryTimer.current = window.setTimeout(() => {
      api
        .post("/search/history", {
          scope,
          query,
          filters: {
            from: filters.from || null,
            startDate: filters.startDate || null,
            endDate: filters.endDate || null,
            hasMedia: filters.hasMedia,
            minLikes: filters.minLikes ? parseInt(filters.minLikes, 10) : null,
          },
        })
        .catch(() => {});
    }, 1500);
  };

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears stale results while user is mid-typing a too-short query
      setUsers([]);
      setHasMore(false);
      setLoading(false);
      setPosts([]);
      setPostsHasMore(false);
      setPostsLoading(false);
      setComments([]);
      setCommentsHasMore(false);
      setCommentsLoading(false);
      setMessages([]);
      setMessagesHasMore(false);
      setMessagesLoading(false);
      return;
    }
    // A query-less search is still valid on posts/comments/messages
    // when filters are active ("just @sam's posts with media") - only
    // users search requires an actual query string.
    if (trimmed.length === 0 && activeFilterCount === 0 && activeTab !== "users") {
      return;
    }
    const delay = trimmed.length === 0 ? 0 : 400;
    const t = window.setTimeout(() => {
      if (activeTab === "users") fetchUsers(trimmed, 1);
      else if (activeTab === "posts") {
        fetchPosts(trimmed, null, true);
        logHistory("posts", trimmed);
      } else if (activeTab === "comments") {
        fetchComments(trimmed, null, true);
        logHistory("comments", trimmed);
      } else if (activeTab === "messages") {
        fetchMessages(trimmed, null, true);
        logHistory("messages", trimmed);
      }
    }, delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeTab, filters]);

  // Trending ignores the search box entirely (global ranked surface,
  // not a query) - load once on first visit to the tab, same
  // load-once-then-reuse-state pattern the old Home tabs used.
  useEffect(() => {
    if (activeTab !== "trending" || trendingLoaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-tab-open; setState happens inside the async fetchTrending fn
    fetchTrending(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, trendingLoaded]);

  useEffect(() => {
    if (activeTab !== "users") return;
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !loading
        ) {
          fetchUsers(search.trim(), page + 1);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [activeTab, page, hasMore, isLoadingMore, loading, search]);

  useEffect(() => {
    if (activeTab !== "posts") return;
    const target = postsObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          postsHasMore &&
          !postsIsLoadingMore &&
          !postsLoading
        ) {
          fetchPosts(search.trim(), postsCursor, false);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    activeTab,
    postsCursor,
    postsHasMore,
    postsIsLoadingMore,
    postsLoading,
    search,
  ]);

  useEffect(() => {
    if (activeTab !== "comments") return;
    const target = commentsObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          commentsHasMore &&
          !commentsIsLoadingMore &&
          !commentsLoading
        ) {
          fetchComments(search.trim(), commentsCursor, false);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    activeTab,
    commentsCursor,
    commentsHasMore,
    commentsIsLoadingMore,
    commentsLoading,
    search,
  ]);

  useEffect(() => {
    if (activeTab !== "messages") return;
    const target = messagesObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          messagesHasMore &&
          !messagesIsLoadingMore &&
          !messagesLoading
        ) {
          fetchMessages(search.trim(), messagesCursor, false);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    activeTab,
    messagesCursor,
    messagesHasMore,
    messagesIsLoadingMore,
    messagesLoading,
    search,
  ]);

  useEffect(() => {
    if (activeTab !== "trending") return;
    const target = trendingObserverTarget.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          trendingHasMore &&
          !trendingIsLoadingMore &&
          !trendingLoading
        ) {
          fetchTrending(trendingCursor, false);
        }
      },
      { threshold: 0.1 },
    );
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [
    activeTab,
    trendingCursor,
    trendingHasMore,
    trendingIsLoadingMore,
    trendingLoading,
  ]);

  // Tier-2 revalidate-on-focus — re-runs the active tab's first-page
  // fetch. getCached's revalidate:true paints cached results instantly
  // and refreshes behind the scenes; only wired for the three cached
  // tabs (users/posts/trending).
  useRefetchOnFocus(() => {
    if (activeTab === "users") fetchUsers(search.trim(), 1);
    else if (activeTab === "posts") fetchPosts(search.trim(), null, true);
    else if (activeTab === "trending") fetchTrending(null, true);
  });

  const handleFollow = async (userId) => {
    if (followingId) return;
    setFollowingId(userId);
    try {
      const res = await api.put(`/users/follow/${userId}`);
      // Trust the server's answer for whether we're now following,
      // rather than re-deriving it from local state (which could be
      // stale if this list hasn't refetched recently).
      setUsers((prev) =>
        prev.map((u) => {
          if (u._id !== userId) return u;
          return {
            ...u,
            followers: res.data.following
              ? [...u.followers, currentUser._id]
              : u.followers.filter((id) => id !== currentUser._id),
          };
        }),
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't update follow status. Try again.");
    } finally {
      setFollowingId(null);
    }
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setShowFiltersModal(false);
  };

  const handleSelectHistoryOrSaved = (entry) => {
    setSearch(entry.query || "");
    setFilters({
      from: entry.filters?.from || "",
      startDate: entry.filters?.startDate
        ? new Date(entry.filters.startDate).toISOString().slice(0, 10)
        : "",
      endDate: entry.filters?.endDate
        ? new Date(entry.filters.endDate).toISOString().slice(0, 10)
        : "",
      hasMedia: entry.filters?.hasMedia ?? null,
      minLikes: entry.filters?.minLikes ? String(entry.filters.minLikes) : "",
    });
    setSearchFocused(false);
  };

  const handleDeleteHistoryEntry = async (id) => {
    setHistory((prev) => prev.filter((h) => h._id !== id));
    try {
      await api.delete(`/search/history/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearHistory = async () => {
    setHistory([]);
    try {
      await api.delete("/search/history", { params: { scope: activeTab } });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSavedSearch = async (id) => {
    setSavedSearches((prev) => prev.filter((s) => s._id !== id));
    try {
      await api.delete(`/search/saved/${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCurrentSearch = async () => {
    const trimmed = search.trim();
    if (!trimmed && activeFilterCount === 0) {
      toast.error("Type a search or set a filter first.");
      return;
    }
    try {
      const res = await api.post("/search/saved", {
        scope: activeTab,
        query: trimmed,
        label: trimmed || "",
        filters: {
          from: filters.from || null,
          startDate: filters.startDate || null,
          endDate: filters.endDate || null,
          hasMedia: filters.hasMedia,
          minLikes: filters.minLikes ? parseInt(filters.minLikes, 10) : null,
        },
      });
      setSavedSearches((prev) => [res.data.savedSearch, ...prev]);
      toast.success("Search saved");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save search. Try again.");
    }
  };

  const showFilterSurface = ["posts", "comments", "messages"].includes(activeTab);
  const showHistoryPanel =
    showFilterSurface && searchFocused && !search.trim() && activeFilterCount === 0;

  return (
    <MainLayout>
      <div className="space-y-4">
        <TrendingHashtagsWidget />

        {/* Search-type dropdown + Trending tab — the four searchable
            surfaces live behind one dropdown (People is the default);
            Trending stays as its own button beside it. */}
        <div className="bg-card border border-stroke rounded-2xl p-1 flex gap-1">
          <div className="relative flex-1">
            <button
              ref={searchTriggerRef}
              onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
              aria-haspopup="menu"
              aria-expanded={searchDropdownOpen}
              className={`w-full flex items-center justify-center gap-1.5 text-base font-semibold py-2 rounded-xl transition whitespace-nowrap px-2 ${
                SEARCH_TYPE_OPTIONS.some((t) => t.value === activeTab)
                  ? "bg-primary-600 text-white"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {SEARCH_TYPE_OPTIONS.find((t) => t.value === searchType)?.label}
              <FiChevronDown
                size={15}
                className={`shrink-0 transition-transform ${
                  searchDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {searchDropdownOpen && (
              <div
                ref={searchMenuRef}
                className="absolute left-0 right-0 top-full mt-1 bg-card rounded-xl shadow-lg border border-stroke z-40 py-1"
              >
                {SEARCH_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSearchTypeChange(option.value)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-2 text-base transition ${
                      searchType === option.value
                        ? "bg-primary-50 text-primary-700 font-semibold"
                        : "text-ink hover:bg-surface"
                    }`}
                  >
                    <span>{option.label}</span>
                    {searchType === option.value && <FiCheck size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab("trending")}
            className={`flex-1 flex items-center justify-center gap-1 text-base font-semibold py-2 rounded-xl transition whitespace-nowrap px-2 ${
              activeTab === "trending"
                ? "bg-primary-600 text-white"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <HiOutlineSparkles size={15} />
            Trending
          </button>
        </div>

        {/* Search bar - Trending has no query, so the bar hides for it
            entirely rather than rendering a disabled input. */}
        {activeTab !== "trending" && (
          <div className="relative">
            <div className="bg-card border border-stroke rounded-2xl px-4 py-3 flex items-center gap-3">
              <FiSearch className="text-ink-muted shrink-0" size={16} />
              <input
                type="text"
                placeholder={
                  activeTab === "users"
                    ? "Search users..."
                    : activeTab === "comments"
                      ? "Search comments..."
                      : activeTab === "messages"
                        ? "Search your messages..."
                        : "Search posts or #hashtag..."
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                className="flex-1 text-base text-ink placeholder:text-ink-muted outline-none bg-transparent"
              />
              {showFilterSurface && (
                <button
                  onClick={() => setShowFiltersModal(true)}
                  className={`relative shrink-0 p-1.5 rounded-lg transition ${
                    activeFilterCount > 0
                      ? "bg-primary-50 text-primary-600"
                      : "text-ink-muted hover:text-ink"
                  }`}
                  aria-label="Search filters"
                >
                  <FiSliders size={16} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
              {showFilterSurface && (search.trim() || activeFilterCount > 0) && (
                <button
                  onClick={handleSaveCurrentSearch}
                  className="shrink-0 p-1.5 rounded-lg text-ink-muted hover:text-primary-600 transition"
                  aria-label="Save this search"
                >
                  <FiStar size={16} />
                </button>
              )}
            </div>

            {showHistoryPanel && (
              <div className="absolute left-0 right-0 top-full mt-2 z-10">
                <SearchHistoryPanel
                  history={history}
                  savedSearches={savedSearches}
                  onSelect={handleSelectHistoryOrSaved}
                  onDeleteHistory={handleDeleteHistoryEntry}
                  onClearHistory={handleClearHistory}
                  onDeleteSaved={handleDeleteSavedSearch}
                />
              </div>
            )}
          </div>
        )}

        {showFiltersModal && (
          <SearchFiltersModal
            initialFilters={filters}
            onApply={handleApplyFilters}
            onCancel={() => setShowFiltersModal(false)}
          />
        )}

        {/* Hashtag shortcut */}
        {possibleHashtag && (
          <Link
            to={`/hashtag/${possibleHashtag}`}
            className="flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3 text-base text-primary-700 hover:bg-primary-100 transition"
          >
            <FiHash size={15} />
            Jump to <span className="font-semibold">
              #{possibleHashtag}
            </span>{" "}
            hashtag page
          </Link>
        )}

        {activeTab === "users" && (
          <>
            {!loading && !search.trim() && users.length > 0 && (
              <p className="text-sm text-ink-muted px-1">Suggested users</p>
            )}
            {!loading &&
              search.trim().length > 0 &&
              search.trim().length < 2 && (
                <p className="text-sm text-ink-muted text-center py-6">
                  Type at least 2 characters to search.
                </p>
              )}
            {!loading && search.trim().length >= 2 && users.length === 0 && (
              <p className="text-base text-ink-muted text-center py-10">
                No users found for "{search}"
              </p>
            )}

            {loading && (
              <>
                <UserCardSkeleton />
                <UserCardSkeleton />
                <UserCardSkeleton />
              </>
            )}

            {!loading &&
              users.map((user) => {
                const isFollowing = user.followers.includes(currentUser._id);
                const isOnline = onlineUsers.includes(user._id);
                return (
                  <div
                    key={user._id}
                    className="bg-card border border-stroke rounded-2xl p-4 flex items-center justify-between gap-4"
                  >
                    <Link
                      to={`/profile/${user._id}`}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={resizedImageUrl(user.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
                          alt={user.name}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary-100"
                        />
                        <span
                          className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-white ${isOnline ? "bg-primary-400" : "bg-gray-300"}`}
                          title={isOnline ? "Online" : "Offline"}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-ink truncate flex items-center gap-1">
                          {user.name}
                          <VerifiedBadge verifications={user.verifications} size="sm" />
                        </p>
                        {user.username && (
                          <p className="text-sm text-primary-600 truncate">
                            @{user.username}
                          </p>
                        )}
                        <p className="text-sm text-ink-muted truncate">
                          {user.bio || "No bio"}
                        </p>
                        {!search.trim() && user.mutualFollowersCount > 0 && (
                          <p className="text-xs text-primary-600 truncate">
                            {user.mutualFollowersCount} mutual follower
                            {user.mutualFollowersCount === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                    </Link>

                    <button
                      onClick={() => handleFollow(user._id)}
                      disabled={followingId === user._id}
                      className={`shrink-0 px-4 py-1.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFollowing
                          ? "bg-surface border border-stroke text-ink-sub hover:border-red-300 hover:text-red-500"
                          : "bg-primary-600 text-white hover:bg-primary-800"
                      }`}
                    >
                      {followingId === user._id
                        ? "..."
                        : isFollowing
                          ? "Following"
                          : "Follow"}
                    </button>
                  </div>
                );
              })}

            {!loading && hasMore && users.length > 0 && (
              <div ref={observerTarget} className="py-4 text-center">
                {isLoadingMore && (
                  <p className="text-sm text-ink-muted">Loading more...</p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "posts" && (
          <>
            {!postsLoading &&
              search.trim().length > 0 &&
              search.trim().length < 2 && (
                <p className="text-sm text-ink-muted text-center py-6">
                  Type at least 2 characters to search.
                </p>
              )}
            {!postsLoading &&
              (search.trim().length >= 2 || activeFilterCount > 0) &&
              posts.length === 0 && (
                <p className="text-base text-ink-muted text-center py-10">
                  No posts found{search.trim() ? ` for "${search}"` : " for these filters"}
                </p>
              )}
            {!postsLoading && search.trim().length === 0 && activeFilterCount === 0 && (
              <p className="text-base text-ink-muted text-center py-10">
                Search for posts by caption or #hashtag.
              </p>
            )}

            {postsLoading && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}

            {!postsLoading &&
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  postId={post._id}
                  userId={post.user._id}
                  name={post.user.name}
                  username={post.user.username}
                  profilePic={post.user.profilePic}
                  verifications={post.user.verifications}
                  time={new Date(post.createdAt).toLocaleString()}
                  text={post.text}
                  images={post.images}
                  video={post.video}
                  likes={post.likesCount}
                  commentsCount={post.commentsCount}
                  reposts={post.repostsCount}
                  isLiked={post.isLiked}
                  isBookmarked={post.isBookmarked}
                  isReposted={post.isReposted}
                  reactionSummary={post.reactionSummary}
                  myReaction={post.myReaction}
                  isQuotePost={post.isQuotePost}
                  quoteOf={post.quoteOf}
                  edited={post.edited}
                  privacy={post.privacy}
                  editedAt={post.editedAt}
                  onDelete={(id) =>
                    setPosts((prev) => prev.filter((p) => p._id !== id))
                  }
                />
              ))}

            {!postsLoading && postsHasMore && posts.length > 0 && (
              <div ref={postsObserverTarget} className="py-4 text-center">
                {postsIsLoadingMore && (
                  <p className="text-sm text-ink-muted">Loading more...</p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "comments" && (
          <>
            {!commentsLoading &&
              search.trim().length > 0 &&
              search.trim().length < 2 && (
                <p className="text-sm text-ink-muted text-center py-6">
                  Type at least 2 characters to search.
                </p>
              )}
            {!commentsLoading &&
              (search.trim().length >= 2 || activeFilterCount > 0) &&
              comments.length === 0 && (
                <p className="text-base text-ink-muted text-center py-10">
                  No comments found{search.trim() ? ` for "${search}"` : " for these filters"}
                </p>
              )}
            {!commentsLoading && search.trim().length === 0 && activeFilterCount === 0 && (
              <p className="text-base text-ink-muted text-center py-10">
                Search comments across public posts.
              </p>
            )}

            {commentsLoading && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}

            {!commentsLoading &&
              comments.map((comment) => (
                <CommentSearchResultCard key={comment._id} comment={comment} />
              ))}

            {!commentsLoading && commentsHasMore && comments.length > 0 && (
              <div ref={commentsObserverTarget} className="py-4 text-center">
                {commentsIsLoadingMore && (
                  <p className="text-sm text-ink-muted">Loading more...</p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "messages" && (
          <>
            {!messagesLoading &&
              search.trim().length > 0 &&
              search.trim().length < 2 && (
                <p className="text-sm text-ink-muted text-center py-6">
                  Type at least 2 characters to search.
                </p>
              )}
            {!messagesLoading &&
              (search.trim().length >= 2 || activeFilterCount > 0) &&
              messages.length === 0 && (
                <p className="text-base text-ink-muted text-center py-10">
                  No messages found{search.trim() ? ` for "${search}"` : " for these filters"}
                </p>
              )}
            {!messagesLoading && search.trim().length === 0 && activeFilterCount === 0 && (
              <p className="text-base text-ink-muted text-center py-10">
                Search your own conversations.
              </p>
            )}

            {messagesLoading && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}

            {!messagesLoading &&
              messages.map((message) => (
                <MessageSearchResultCard key={message._id} message={message} />
              ))}

            {!messagesLoading && messagesHasMore && messages.length > 0 && (
              <div ref={messagesObserverTarget} className="py-4 text-center">
                {messagesIsLoadingMore && (
                  <p className="text-sm text-ink-muted">Loading more...</p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "trending" && (
          <>
            {trendingLoading && (
              <>
                <PostSkeleton />
                <PostSkeleton />
              </>
            )}

            {!trendingLoading && trendingPosts.length === 0 && (
              <div className="bg-card border border-stroke rounded-2xl p-10 text-center">
                <p className="text-3xl mb-2">✨</p>
                <h2 className="text-lg font-semibold text-ink">
                  Nothing trending yet
                </h2>
                <p className="text-base text-ink-muted mt-1">
                  Check back once posts start getting engagement.
                </p>
              </div>
            )}

            {!trendingLoading &&
              trendingPosts.map((post) => (
                <PostCard
                  key={post._id}
                  postId={post._id}
                  userId={post.user._id}
                  name={post.user.name}
                  username={post.user.username}
                  profilePic={post.user.profilePic}
                  verifications={post.user.verifications}
                  time={new Date(post.createdAt).toLocaleString()}
                  text={post.text}
                  images={post.images}
                  video={post.video}
                  likes={post.likesCount}
                  commentsCount={post.commentsCount}
                  reposts={post.repostsCount}
                  isLiked={post.isLiked}
                  isBookmarked={post.isBookmarked}
                  isReposted={post.isReposted}
                  reactionSummary={post.reactionSummary}
                  myReaction={post.myReaction}
                  isQuotePost={post.isQuotePost}
                  quoteOf={post.quoteOf}
                  edited={post.edited}
                  privacy={post.privacy}
                  editedAt={post.editedAt}
                  onDelete={(id) =>
                    setTrendingPosts((prev) => prev.filter((p) => p._id !== id))
                  }
                />
              ))}

            {!trendingLoading && trendingPosts.length > 0 && (
              <div ref={trendingObserverTarget} className="py-4 text-center">
                {trendingIsLoadingMore && (
                  <>
                    <PostSkeleton />
                    <PostSkeleton />
                  </>
                )}
                {!trendingHasMore && (
                  <p className="text-sm text-ink-muted">You're all caught up</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Explore;
