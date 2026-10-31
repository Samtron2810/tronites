import TrendingHashtagsWidget from "./TrendingHashtagsWidget";
import CreatorCornerCard from "./CreatorCornerCard";
import PeopleToFollow from "./PeopleToFollow";

// Right-hand column for MainLayout's `rail` prop (xl+ only).
const RightRail = () => (
  <div className="space-y-8">
    <TrendingHashtagsWidget variant="list" />
    <CreatorCornerCard />
    <PeopleToFollow />
  </div>
);

export default RightRail;
