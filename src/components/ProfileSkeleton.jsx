const ProfileSkeleton = () => (
  <div className="min-h-screen bg-surface">
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white border border-stroke rounded-2xl overflow-hidden animate-pulse">
        <div className="h-24 bg-stroke" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-stroke ring-4 ring-white" />
            <div className="w-24 h-9 bg-stroke rounded-xl mt-10" />
          </div>
          <div className="h-4 bg-stroke rounded w-36 mb-2" />
          <div className="h-3 bg-stroke rounded w-52 mb-4" />
          <div className="flex gap-5">
            <div className="h-3 bg-stroke rounded w-16" />
            <div className="h-3 bg-stroke rounded w-20" />
            <div className="h-3 bg-stroke rounded w-20" />
          </div>
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-stroke rounded-2xl p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-stroke" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-stroke rounded w-28" />
              <div className="h-2.5 bg-stroke rounded w-16" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-2.5 bg-stroke rounded" />
            <div className="h-2.5 bg-stroke rounded w-4/5" />
          </div>
          <div className="h-48 bg-stroke rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

export default ProfileSkeleton;
