"use client";

import type {
  PortfolioConfig,
  PortfolioExperience,
  PortfolioProject,
  PortfolioSkillGroup,
} from "@/lib/types";

type Props = {
  content: PortfolioConfig;
  preview?: boolean;
};

function sectionTitle(label: string, title: string) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
        {label}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
    </div>
  );
}

function firstWords(value: string, fallback: string) {
  const text = value.trim();
  return text.length > 0 ? text : fallback;
}

export default function PortfolioApp({ content, preview = false }: Props) {
  const profile = content.profile;
  const featuredProjects = content.projects.filter((project) => project.featured);
  const projects = featuredProjects.length > 0 ? featuredProjects : content.projects;
  const accent = content.theme.accent || "#6C63FF";
  const navItems = [
    ["Experience", "#experience", content.experience.length > 0],
    ["Projects", "#projects", projects.length > 0],
    ["Skills", "#skills", content.skills.length > 0],
    ["Contact", "#contact", true],
  ] as const;

  return (
    <main
      className={`min-h-screen bg-[#08080e] text-slate-100 ${preview ? "text-[13px]" : ""}`}
      style={{ "--portfolio-accent": accent } as React.CSSProperties}
    >
      <nav className="sticky top-0 z-30 border-b border-white/10 bg-[#08080e]/90 px-6 py-3 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <a href="#" className="text-sm font-semibold text-white">
            {profile.name || content.recipient_name}
          </a>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-400 sm:gap-5">
            {navItems.filter((item) => item[2]).map(([label, href]) => (
              <a key={label} href={href} className="transition hover:text-cyan-200">
                {label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 sm:px-10 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,245,255,0.14),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(108,99,255,0.22),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-200">
              {content.gift_mode === "self" ? "Personal portfolio" : `A portfolio gift for ${content.recipient_name}`}
            </p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
              {firstWords(profile.name, content.recipient_name)}
            </h1>
            <p className="mt-4 max-w-3xl text-xl font-medium text-cyan-100">
              {firstWords(profile.headline, "Builder, engineer, and creative problem solver")}
            </p>
            <p className="mt-6 max-w-3xl leading-7 text-slate-300">
              {firstWords(profile.summary, "A focused portfolio generated from the provided source material.")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                >
                  Contact
                </a>
              )}
              {profile.links.slice(0, 3).map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Snapshot
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Location</dt>
                <dd className="mt-1 text-slate-200">{profile.location || "Open to remote"}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Focus</dt>
                <dd className="mt-1 text-slate-200">
                  {content.skills[0]?.skills.slice(0, 4).join(", ") || "Engineering, product, delivery"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Built From</dt>
                <dd className="mt-1 text-slate-200">
                  {content.source_summary.inferred_from.join(", ") || "Resume and notes"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        {content.experience.length > 0 && (
          <section id="experience" className="mb-14 scroll-mt-20">
            {sectionTitle("// experience", "Work that proves the story")}
            <div className="space-y-4">
              {content.experience.map((item, index) => (
                <ExperienceBlock key={`${item.company}-${item.title}-${index}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section id="projects" className="mb-14 scroll-mt-20">
            {sectionTitle("// projects", "Selected work")}
            <div className="grid gap-4 md:grid-cols-2">
              {projects.slice(0, preview ? 2 : 6).map((project, index) => (
                <ProjectBlock key={`${project.title}-${index}`} project={project} />
              ))}
            </div>
          </section>
        )}

        {content.skills.length > 0 && (
          <section id="skills" className="mb-14 scroll-mt-20">
            {sectionTitle("// skills", "Tools and strengths")}
            <div className="grid gap-4 md:grid-cols-3">
              {content.skills.slice(0, preview ? 3 : undefined).map((group) => (
                <SkillGroup key={group.label} group={group} />
              ))}
            </div>
          </section>
        )}

        {content.education.length > 0 && !preview && (
          <section id="education" className="mb-14 scroll-mt-20">
            {sectionTitle("// education", "Education")}
            <div className="grid gap-4 md:grid-cols-2">
              {content.education.map((education) => (
                <div key={`${education.institution}-${education.credential}`} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="font-semibold text-white">{education.credential}</h3>
                  <p className="mt-1 text-sm text-slate-300">{education.institution}</p>
                  {education.period && <p className="mt-2 text-xs text-slate-500">{education.period}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {content.source_summary.missing_info.length > 0 && (
          <section className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100">
            <p className="font-semibold">Still useful to add</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {content.source_summary.missing_info.slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section id="contact" className="mt-14 scroll-mt-20 rounded-lg border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            {"// contact"}
          </p>
          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-white">Let&apos;s connect</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Interested in collaborating, hiring, or learning more about this work?
                Reach out through the available contact links.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                >
                  Email
                </a>
              )}
              {profile.links.slice(0, 4).map((link) => (
                <a
                  key={`contact-${link.label}-${link.url}`}
                  href={link.url}
                  className="rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-slate-500 sm:px-10">
        <p>
          Copyright {profile.name || content.recipient_name} {new Date().getFullYear()} BinosusAI. Generated with AaaG.
        </p>
      </footer>
    </main>
  );
}

function ExperienceBlock({ item }: { item: PortfolioExperience }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
          <p className="text-sm text-cyan-200">{item.company}</p>
        </div>
        <p className="text-xs text-slate-500">{item.period}</p>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
        {item.bullets.slice(0, 4).map((bullet) => (
          <li key={bullet}>- {bullet}</li>
        ))}
      </ul>
      {item.tech.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.tech.slice(0, 8).map((tech) => (
            <span key={tech} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              {tech}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function ProjectBlock({ project }: { project: PortfolioProject }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h3 className="font-semibold text-white">{project.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{project.description}</p>
      {project.impact && (
        <p className="mt-3 text-sm font-medium text-cyan-200">{project.impact}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.slice(0, 8).map((tag) => (
          <span key={tag} className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-xs text-cyan-100">
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}

function SkillGroup({ group }: { group: PortfolioSkillGroup }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
      <h3 className="font-semibold text-white">{group.label}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {group.skills.map((skill) => (
          <span key={skill} className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
            {skill}
          </span>
        ))}
      </div>
    </div>
  );
}
