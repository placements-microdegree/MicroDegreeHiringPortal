import PropTypes from "prop-types";

export default function JobCardShimmer({ compact = false }) {
  if (compact) {
    return (
      <article className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-2">
            <div className="shimmer h-4 w-36 rounded-md" />
            <div className="shimmer h-3 w-44 rounded-md" />
          </div>
          <div className="shimmer h-6 w-20 rounded-lg" />
        </div>
        <div className="mt-2 shimmer h-3 w-32 rounded-md" />
        <div className="mt-3 flex justify-end">
          <div className="shimmer h-8 w-16 rounded-lg" />
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="shimmer h-5 w-44 rounded-md" />
          <div className="shimmer h-4 w-32 rounded-md" />
        </div>
        <div className="shimmer h-6 w-20 rounded-full" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="shimmer h-4 w-52 rounded-md" />
        <div className="shimmer h-4 w-40 rounded-md" />
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="shimmer h-3 w-16 rounded-md" />
          <div className="mt-1 shimmer h-4 w-24 rounded-md" />
        </div>
        <div className="shimmer h-4 w-36 rounded-md" />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <div className="shimmer h-6 w-20 rounded-full" />
        <div className="shimmer h-6 w-16 rounded-full" />
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <div className="shimmer h-9 w-24 rounded-xl" />
        <div className="shimmer h-9 w-24 rounded-xl" />
      </div>
    </article>
  );
}

JobCardShimmer.propTypes = {
  compact: PropTypes.bool,
};
