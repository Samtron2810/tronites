// Single source of truth for the "no profile picture" fallback image.
// Replaces the old `https://i.pravatar.cc/...` fallback used throughout
// the app: pravatar is a third-party call that can go down, is slow, and
// (since it's keyed by user id in some call sites) leaked user ids to a
// service we don't control. This is bundled locally by Vite instead.
import noProfilePic from "./noprofilepic.jpg";

export default noProfilePic;
