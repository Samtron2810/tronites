const NotificationSkeleton = () => {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-gray-300"></div>

      {/* Message */}
      <div className="flex-1">
        <div className="h-4 bg-gray-300 rounded w-48"></div>
        <div className="h-3 bg-gray-200 rounded w-24 mt-2"></div>
      </div>

      {/* Icon */}
      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
    </div>
  );
};

export default NotificationSkeleton;
