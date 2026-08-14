import { useState, useRef, useCallback } from "react";
import api from "../services/api";

// Detects an in-progress "@partial" token right before the cursor and
// fetches matching users for a suggestion dropdown. Works with a plain
// <input> or <textarea> — pass the element's value/onChange/selection
// through the returned handlers.
const useMentionAutocomplete = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");
  const mentionStartRef = useRef(null); // index of the "@" in the text
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/users/search", { params: { q: query } });
        const withUsername = (res.data.users || []).filter((u) => u.username);
        setSuggestions(withUsername.slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }, []);

  // Call on every keystroke with the field's current value and cursor
  // position (input.selectionStart).
  const handleTextChange = useCallback(
    (text, cursorPos) => {
      const upToCursor = text.slice(0, cursorPos);
      const match = upToCursor.match(/(?:^|\s)@([a-zA-Z0-9_]{0,20})$/);

      if (!match) {
        setShowSuggestions(false);
        mentionStartRef.current = null;
        return;
      }

      const query = match[1];
      mentionStartRef.current = cursorPos - query.length - 1; // position of "@"
      setActiveQuery(query);

      if (query.length === 0) {
        setSuggestions([]);
        setShowSuggestions(true);
        return;
      }

      setShowSuggestions(true);
      fetchSuggestions(query);
    },
    [fetchSuggestions],
  );

  // Call when a suggestion is picked — returns the new text with the
  // "@partial" replaced by "@username ", and the new cursor position.
  const applySuggestion = useCallback((text, username) => {
    const start = mentionStartRef.current;
    if (start === null) return { text, cursorPos: text.length };

    const before = text.slice(0, start);
    const afterMatch = text.slice(start).match(/^@[a-zA-Z0-9_]*/);
    const restStart = start + (afterMatch ? afterMatch[0].length : 0);
    const after = text.slice(restStart);

    const newText = `${before}@${username} ${after}`;
    const cursorPos = before.length + username.length + 2;

    setShowSuggestions(false);
    mentionStartRef.current = null;
    return { text: newText, cursorPos };
  }, []);

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
    mentionStartRef.current = null;
  }, []);

  return {
    suggestions,
    showSuggestions,
    activeQuery,
    handleTextChange,
    applySuggestion,
    closeSuggestions,
  };
};

export default useMentionAutocomplete;
