import { buttonVariants, cn } from "@eli-coach-platform/ui";
import { Plus } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, type MetaFunction } from "react-router";

export const meta: MetaFunction = () => [{ title: "Training & Programs | Evoa" }];

const EXERCISE_LIBRARY_PATH = "/coach/training/exercises";
const TRAINING_SECTIONS = [
  { end: true, href: "/coach/training/plans", label: "Client Plans" },
  { end: true, href: "/coach/training/templates", label: "Templates" },
  { end: false, href: EXERCISE_LIBRARY_PATH, label: "Exercise Library" },
] as const;

export default function TrainingHubRoute() {
  const { pathname } = useLocation();
  const showsExerciseLibrary =
    pathname === EXERCISE_LIBRARY_PATH ||
    pathname.startsWith(`${EXERCISE_LIBRARY_PATH}/`);

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-heading text-display-md font-semibold text-text-primary">
            Training &amp; Programs
          </h1>
          <p className="mt-1 text-body-base text-text-secondary">
            Manage client plans, templates, and exercises
          </p>
        </div>
        {showsExerciseLibrary ? (
          <Link
            className={cn(buttonVariants({ context: "portal", variant: "primary" }), "self-start md:self-auto")}
            to={`${EXERCISE_LIBRARY_PATH}/new`}
          >
            <Plus aria-hidden="true" size={20} />
            New Exercise
          </Link>
        ) : null}
      </div>
      <nav aria-label="Training sections" className="border-b border-border-subtle">
        <ul className="flex gap-6">
          {TRAINING_SECTIONS.map((section) => (
            <li key={section.href}>
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "-mb-px inline-flex min-h-11 items-center border-b-2 px-2 text-body-sm font-medium transition-colors",
                    {
                      "border-brand-primary text-brand-primary": isActive,
                      "border-transparent text-text-secondary hover:text-text-primary":
                        !isActive,
                    },
                  )
                }
                end={section.end}
                to={section.href}
              >
                {section.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
