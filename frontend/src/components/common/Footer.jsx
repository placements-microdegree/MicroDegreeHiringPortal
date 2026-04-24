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

function FooterLinkList({ title, links, className = "" }) {
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 sm:text-sm">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-300 sm:mt-4 sm:space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className={`inline-block transition-all duration-200 hover:translate-x-1 hover:text-white ${
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
  className: PropTypes.string,
};

function Footer() {
  return (
    <footer
      className="relative overflow-hidden bg-slate-950 text-white"
      aria-label="MicroDegree footer"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.18),transparent_36%),radial-gradient(circle_at_90%_18%,rgba(236,72,153,0.12),transparent_30%)]" />

      <section className="relative mx-auto grid w-full max-w-7xl grid-cols-2 gap-y-10 gap-x-6 px-5 py-10 sm:px-8 sm:py-12 lg:grid-cols-5 lg:gap-x-5 lg:px-10 lg:py-14">
        {/* Brand + social — full width on mobile, 1 col on lg */}
        <div className="col-span-2 lg:col-span-1">
          <h2 className="text-3xl leading-none tracking-tight text-[#8e6ced]">
            Micro<span className="text-[#ff0149] font-extrabold">Degree</span>
            <sup className="ml-1 text-2xl text-slate-300">®</sup>
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            MicroDegree is an Ed-tech platform teaching coding and job-ready
            skills in Kannada at an affordable price.
          </p>

          <div className="mt-5 flex items-center gap-3">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                aria-label={item.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/70 text-sm text-slate-200 transition-all duration-200 hover:-translate-y-1 hover:scale-110 hover:border-cyan-400 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20"
              >
                {item.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Link lists — 2 cols on mobile, 1 each on lg */}
        <FooterLinkList title="Live-Recorded Courses" links={COURSE_LINKS} />
        <FooterLinkList title="Company" links={COMPANY_LINKS} />
        <FooterLinkList
          title="Useful Links"
          links={USEFUL_LINKS}
          className="col-span-2 sm:col-span-1"
        />

        {/* Contact — full width on mobile, 1 col on lg */}
        <div className="col-span-2 lg:col-span-1">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 sm:text-sm">
            Contact us
          </h3>

          <div className="mt-3 flex items-center gap-2 text-sm text-slate-300 sm:mt-4">
            <HiPhone className="shrink-0 text-cyan-300" />
            <a href="tel:08047109999" className="transition hover:text-white">
              0804-710-9999
            </a>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-slate-200">Mangaluru:</span>{" "}
            K-tech Innovation Hub, 3rd Floor, Plama Building, Bejai, Mangaluru,
            Karnataka 575004.
          </p>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <HiMail className="shrink-0 text-cyan-300" />
            <a
              href="mailto:hello@microdegree.work"
              className="break-all transition hover:text-white"
            >
              hello@microdegree.work
            </a>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            <span className="font-semibold text-slate-200">Bengaluru:</span>{" "}
            Sri Guruprasad Vasavi Classic, 3rd Floor, 10th Main Rd, 4th Block,
            Jayanagar, Bengaluru, Karnataka 560011.
          </p>
        </div>
      </section>

      <section className="relative border-t border-slate-800/90 bg-slate-950/90">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-10">
          <p className="text-xs text-slate-400 sm:text-sm">
            Copyright 2026 MICRODEGREE EDUCATION PRIVATE LIMITED. All Rights
            Reserved.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 sm:text-sm">
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="transition-colors duration-200 hover:text-white"
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
