import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import PostByIdModal from "../components/PostByIdModal";

// Standalone landing route for a single post — /post/:id. Exists so
// notifications (and anything else that only knows a post's id) can
// link straight to "this post's own detail view" from anywhere,
// instead of needing to be rendered inside a feed that already has a
// PostCard to open it from.
//
// It reuses PostByIdModal pinned open (the same fetch-by-id detail
// view the quote-embed click-through uses), so a post opened from a
// notification looks and behaves exactly like one opened anywhere
// else. Closing it navigates back to wherever the user came from.
// The ?comment= / ?parent= params carry the notification deep-link
// target (a comment/reply id and, for replies, its parent comment's
// id) — PostByIdModal forwards them to the comments panel, which
// scrolls to and highlights the row.
const PostView = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <PostByIdModal
        postId={id}
        isOpen
        onClose={() => navigate(-1)}
        highlightCommentId={searchParams.get("comment")}
        highlightParentId={searchParams.get("parent")}
      />
    </MainLayout>
  );
};

export default PostView;