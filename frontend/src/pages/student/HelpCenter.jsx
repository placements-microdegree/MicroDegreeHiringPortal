import { FiMail, FiMapPin, FiPhoneCall } from "react-icons/fi";

const offices = [
  {
    name: "Mangaluru Office",
    address:
      "K-tech Innovation Hub, 3rd Floor, Plama Building, Bejai, Mangaluru, Karnataka 575004.",
  },
  {
    name: "Bengaluru Office",
    address:
      "Sri Guruprasad Vasavi Classic, 3rd Floor, 10th Main Rd, 4th Block, Jayanagar, Bengaluru, Karnataka 560011.",
  },
];

export default function HelpCenter() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-base font-semibold text-slate-900">Contact Us</h1>
        <p className="mt-1 text-sm text-slate-600">
          Reach out to MicroDegree support for placement and portal help.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <a
            href="tel:08047109999"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-primary"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <FiPhoneCall className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Call</span>
            </div>
            <div className="mt-1 text-sm text-slate-700">0804-710-9999</div>
          </a>

          <a
            href="mailto:hello@microdegree.work"
            className="rounded-xl border border-slate-200 p-4 transition hover:border-primary"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <FiMail className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Email</span>
            </div>
            <div className="mt-1 text-sm text-slate-700">
              hello@microdegree.work
            </div>
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {offices.map((office) => (
          <article
            key={office.name}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex items-center gap-2 text-slate-900">
              <FiMapPin className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{office.name}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {office.address}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
