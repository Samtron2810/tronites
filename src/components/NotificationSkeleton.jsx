const NotificationSkeleton = () => (
  <div className="flex items-center gap-3 px-5 py-4 animate-pulse">
    <div className="w-10 h-10 rounded-full bg-stroke shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-stroke rounded w-48" />
      <div className="h-2.5 bg-stroke rounded w-24" />
    </div>
    <div className="w-7 h-7 rounded-full bg-stroke shrink-0" />
  </div>
);

export default NotificationSkeleton;
