import React from "react";
import PropTypes from "prop-types";
import { HiPhone, HiMail } from "react-icons/hi";
import {
  FaFacebookF,
  FaLinkedinIn,
  FaYoutube,
  FaInstagram,
} from "react-icons/fa";

const COURSE_LINKS = [
  { label: "Prime", href: "https://www.microdegree.work/prime" },
  { label: "Power BI", href: "https://www.microdegree.work/powerbi" },
  {
    label: "Manual Testing",
    href: "https://microdegree.thinkific.com/courses/manual-testing-recorded",
  },
  {
    label: "Docker & Kubernetes",
    href: "https://www.microdegree.work/dockerandkubernetes",
  },
  {
    label: "Java Automation Testing",
    href: "https://www.microdegree.work/java-at",
  },
  {
    label: "Python Automation Testing",
    href: "https://microdegree.thinkific.com/courses/automation-testing-selenium",
  },
  {
    label: "Python Full-Stack",
    href: "https://www.microdegree.work/pythonfullstack",
  },
];

const COMPANY_LINKS = [
  { label: "About", href: "https://pages.microdegree.work/about.html" },
  {
    label: "All Courses",
    href: "https://courses.microdegree.work/pages/premium-courses",
  },
  {
    label: "Scholarships",
    href: "https://pages.microdegree.work/scholarship.html",
  },
  {
    label: "Trending Course",
    href: "https://courses.microdegree.work/courses/aws-certification-live",
  },
  {
    label: "Refund Policy",
    href: "https://www.microdegree.work/refund-and-course-rescheduling-policy",
  },
];

const USEFUL_LINKS = [
  { label: "Blogs", href: "https://www.microdegree.work/blog", accent: true },
  {
    label: "Hire Talent(HR)",
    href: "https://talent.microdegree.work",
    accent: true,
  },
  {
    label: "Community",
    href: "https://t.me/microdegreekannada",
  },
  {
    label: "DevOps Jobs",
    href: "https://www.microdegree.work/company_vacancies",
    accent: true,
  },
  {
    label: "Full Courses",
    href: "https://www.microdegree.work/YTFullCoursePage",
  },
  {
    label: "Refer & Earn",
    href: "https://mdegree.in/web_referral",
    accent: true,
  },
  {
    label: "Resume Builder",
    href: "https://www.microdegree.work/microresume",
    accent: true,
  },
];

const LEGAL_LINKS = [
  {
    label: "Terms & Conditions",
    href: "https://pages.microdegree.work/termsnconditions.html",
  },
  {
    label: "Refund Policy",
    href: "https://www.microdegree.work/refund-and-course-rescheduling-policy",
  },
  { label: "Legal & Privacy", href: "https://www.microdegree.work/Legal" },
];

const SOCIAL_LINKS = [
  {
    icon: <FaFacebookF />,
    href: "https://www.facebook.com/MicroDegree-101072281390361/?modal=admin_todo_tour",
    label: "Facebook",
  },
  {
    icon: <FaLinkedinIn />,
    href: "https://www.linkedin.com/company/microdegree/?viewAsMember=true",
    label: "LinkedIn",
  },
  {
    icon: <FaYoutube />,
    href: "https://www.youtube.com/channel/UCu8l4v6xqQd8LfOfd0kMPsA",
    label: "YouTube",
  },
  {
    icon: <FaInstagram />,
    href: "https://www.instagram.com/microdegree.work/?hl=en",
    label: "Instagram",
  },
];

function FooterLinkList({ title, links }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">
        {title}
      </h3>
      <ul className="mt-4 space-y-2.5 text-sm text-slate-300">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={`transition hover:text-white ${
                link.accent
                  ? "font-medium text-cyan-300 hover:text-cyan-200"
                  : ""
              }`}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

FooterLinkList.propTypes = {
  title: PropTypes.string.isRequired,
  links: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      href: PropTypes.string.isRequired,
      accent: PropTypes.bool,
    }),
  ).isRequired,
};

function Footer() {
  return (
    <footer
      className="relative overflow-hidden bg-slate-950 text-white"
      aria-label="MicroDegree footer"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.18),transparent_36%),radial-gradient(circle_at_90%_18%,rgba(236,72,153,0.12),transparent_30%)]" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-y-8 gap-x-5 px-5 py-12 sm:px-8 lg:grid-cols-5 lg:px-10 lg:py-14">
        {/* Column 1 */}
        <div>
          <h2 className="text-3xl leading-none tracking-tight text-[#8e6ced]">
            Micro<span className="text-[#ff0149] font-extrabold">Degree</span>
            <sup className="ml-1 text-2xl text-slate-300">®</sup>
          </h2>

          <p className="mt-5 text-sm leading-relaxed text-slate-300">
            MicroDegree is an Ed-tech platform teaching coding and job-ready
            skills in Kannada at an affordable price.
          </p>

          <div className="mt-6 flex items-center gap-3">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-sm text-slate-200 transition hover:-translate-y-0.5 hover:border-cyan-400 hover:text-cyan-300"
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Column 2 */}
        <FooterLinkList title="Live-Recorded Courses" links={COURSE_LINKS} />

        {/* Column 3 */}
        <FooterLinkList title="Company" links={COMPANY_LINKS} />

        {/* Column 4 */}
        <FooterLinkList title="Useful Links" links={USEFUL_LINKS} />

        {/* Column 5 */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">
            Contact us
          </h3>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <HiPhone className="text-cyan-300" />
            <p>0804-710-9999</p>
          </div>

          <p className="mt-3 text-sm text-slate-300">
            Mangaluru Office: K-tech Innovation Hub, 3rd Floor, Plama Building,
            Bejai, Mangaluru, Karnataka 575004.
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <HiMail className="text-cyan-300" />
            <p>hello@microdegree.work</p>
          </div>

          <p className="mt-3 text-sm text-slate-300">
            Bengaluru Office: Sri Guruprasad Vasavi Classic, 3rd Floor, 10th
            Main Rd, 4th Block, Jayanagar, Bengaluru, Karnataka 560011.
          </p>
        </div>
      </section>

      <section className="relative border-t border-slate-800/90 bg-slate-950/90">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p className="text-xs text-slate-400 sm:text-sm">
            Copyright 2026 MICRODEGREE EDUCATION PRIVATE LIMITED. All Rights
            Reserved.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 sm:text-sm">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </footer>
  );
}

export default Footer;
