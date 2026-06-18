const ChatSkeleton = () => {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="px-5 py-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-300"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-32"></div>
              <div className="h-3 bg-gray-200 rounded w-48 mt-2"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ChatSkeleton;
