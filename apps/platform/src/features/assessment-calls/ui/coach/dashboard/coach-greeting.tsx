export function CoachGreeting({ todayCount }: { todayCount: number }) {
  return (
    <div data-parity-root="CoachGreeting">
      <h1 className="mb-3 font-heading text-3xl tracking-tight text-text-primary lg:text-4xl">
        Good morning, Coach.
      </h1>
      <p className="font-medium text-text-muted">
        <span data-parity="today-count">
          You have {todayCount} assessment call{todayCount === 1 ? "" : "s"}{" "}
          today.
        </span>
      </p>
    </div>
  );
}
