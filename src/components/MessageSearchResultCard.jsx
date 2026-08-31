import { Link } from "react-router-dom";
import defaultAvatar from "../assets/defaultAvatar";
import { resizedImageUrl, IMAGE_SIZES } from "../utils/cloudinaryImage";
import { useAuth } from "../context/useAuth";

// otherUser is precomputed server-side (searchMessages) as whichever of
// sender/receiver isn't the caller, so this card never has to work out
// "who am I talking to" itself.
const MessageSearchResultCard = ({ message }) => {
  const { user: currentUser } = useAuth();
  const { otherUser, text, createdAt, sender, images, video } = message;
  const isMine = sender?._id === currentUser?._id || sender === currentUser?._id;

  return (
    <Link
      to={`/chat?user=${otherUser?._id}`}
      className="block bg-card border border-stroke rounded-2xl p-4 hover:border-primary-200 transition"
    >
      <div className="flex items-start gap-3">
        <img
          src={resizedImageUrl(otherUser?.profilePic, IMAGE_SIZES.avatarSmall) || defaultAvatar}
          alt={otherUser?.name}
          className="w-9 h-9 rounded-full object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-base font-semibold text-ink truncate">
              {otherUser?.name}
            </span>
            <span className="text-sm text-ink-muted">·</span>
            <span className="text-sm text-ink-muted">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-base text-ink mt-0.5 break-words">
            {isMine && <span className="text-ink-muted">You: </span>}
            {text || (images?.length ? "📷 Image" : video?.url ? "🎬 Video" : "")}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default MessageSearchResultCard;
