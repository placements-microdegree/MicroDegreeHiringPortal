// FILE: src/pages/student/HelpCenter.jsx

import {
  FiMail,
  FiMapPin,
  FiPhoneCall,
  FiExternalLink,
  FiSmartphone,
} from "react-icons/fi";
import {
  FaInstagram,
  FaYoutube,
  FaLinkedinIn,
  FaFacebookF,
} from "react-icons/fa";

const offices = [
  {
    name: "Mangaluru Office",
    address:
      "K-tech Innovation Hub, 3rd Floor, Plama Building, Bejai, Mangaluru, Karnataka 575004.",
    mapsUrl:
      "https://maps.google.com/?q=K-tech+Innovation+Hub+Plama+Building+Bejai+Mangaluru",
  },
  {
    name: "Bengaluru Office",
    address:
      "Sri Guruprasad Vasavi Classic, 3rd Floor, 10th Main Rd, 4th Block, Jayanagar, Bengaluru, Karnataka 560011.",
    mapsUrl:
      "https://maps.google.com/?q=Sri+Guruprasad+Vasavi+Classic+Jayanagar+Bengaluru",
  },
];

const socials = [
  {
    label: "Instagram",
    url: "https://www.instagram.com/microdegree.work/?hl=en",
    icon: FaInstagram,
    color: "hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50",
  },
  {
    label: "YouTube",
    url: "https://www.youtube.com/channel/UCu8l4v6xqQd8LfOfd0kMPsA",
    icon: FaYoutube,
    color: "hover:border-red-400 hover:text-red-500 hover:bg-red-50",
  },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/microdegree/?viewAsMember=true",
    icon: FaLinkedinIn,
    color: "hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50",
  },
  {
    label: "Facebook",
    url: "https://www.facebook.com/MicroDegree-101072281390361/",
    icon: FaFacebookF,
    color: "hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50",
  },
];

export default function HelpCenter() {
  return (
    <div className="space-y-4">

      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h1 className="text-base font-semibold text-slate-900">Help Center</h1>
        <p className="mt-1 text-sm text-slate-600">
          Reach out to MicroDegree support for placement and portal help.
        </p>
      </section>

      {/* Contact */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">📞 Contact Us</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <a
            href="tel:08047109999"
            className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FiPhoneCall className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Call Us
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                0804-710-9999
              </div>
            </div>
          </a>

          <a
            href="mailto:hello@microdegree.work"
            className="flex items-center gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-primary hover:bg-primary/5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FiMail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email Us
              </div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                hello@microdegree.work
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* Offices */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">🏢 Our Offices</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {offices.map((office) => (
            <div
              key={office.name}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FiMapPin className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {office.name}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {office.address}
              </p>
              <a
                href={office.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <FiExternalLink className="h-3 w-3" />
                Open in Maps
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Social + App side by side */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* Social Media */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">🌐 Follow Us</h2>
          <div className="grid grid-cols-2 gap-2">
            {socials.map(({ label, url, icon: Icon, color }) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition ${color}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </a>
            ))}
          </div>
        </section>

        {/* App Download */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">📱 Get the App</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FiSmartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  MicroDegree App
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Access your courses and placement prep on the go.
                </div>
              </div>
            </div>
            <a
              href="https://play.google.com/store/apps/details?id=work.microdegree.trainings&referrer=utm_source=webpage&utm_medium=footer&utm_campaign=app_launch"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              <FiExternalLink className="h-4 w-4" />
              Download on Google Play
            </a>
          </div>
        </section>

      </div>

    </div>
  );
}