import { FiLock, FiPhoneCall } from "react-icons/fi";

const SUPPORT_NUMBER = "08047109999";

export default function EligibilityUnlockCallout() {
  return (
    <div className="fixed bottom-5 right-5 z-40 w-[min(92vw,380px)] rounded-2xl border border-amber-200 bg-white/95 p-4 shadow-xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <FiLock className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">
            To unlock, enroll in MicroDegree live classes.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Please contact the support team.
          </p>

          <a
            href={`tel:${SUPPORT_NUMBER}`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <FiPhoneCall className="h-4 w-4" />
            Call {SUPPORT_NUMBER}
          </a>
        </div>
      </div>
    </div>
  );
}
