/**
 * The wall-clock seam for the spawned application, injected by the integration
 * test rig alone (`platform-server.ts` passes this file to `node --import`).
 *
 * The application under test runs in its own process, so a suite cannot reach
 * its clock the way `vi.useFakeTimers({ toFake: ["Date"] })` reaches an
 * in-process one. This is that same seam, moved across the process boundary:
 * `Date` is replaced before a single application module is loaded, and the
 * suite drives it over the child's IPC channel.
 *
 * Only `Date` is controlled, exactly as `toFake: ["Date"]` does — timers,
 * sockets and every other real input keep running on real time, so the server
 * still answers requests, closes connections and shuts down normally while a
 * case holds its clock still.
 *
 * Nothing in production loads this file: no script, Dockerfile or build step
 * names it. Even so, it installs nothing unless it finds an IPC channel to be
 * driven from, so a stray load outside the rig leaves `Date` untouched.
 */

// A parent that did not ask for an IPC channel is not the rig, so there is
// nobody to take instructions from and nothing to install.
if (typeof process.send === "function") {
  installControllableDate();
}

function installControllableDate() {
  const RealDate = globalThis.Date;

  /** Milliseconds the application should read as "now", or `null` for real time. */
  let fixedTime = null;

  const currentInstant = () =>
    fixedTime === null ? new RealDate() : new RealDate(fixedTime);
  const now = () => (fixedTime === null ? RealDate.now() : fixedTime);

  // A proxy rather than a subclass: it keeps `Date.prototype`, `Date.parse`,
  // `Date.UTC`, `instanceof`, subclassing and the callable `Date()` form
  // exactly as they were, and changes only the two readings of "now".
  globalThis.Date = new Proxy(RealDate, {
    apply() {
      // `Date(...)` without `new` ignores its arguments and answers with the
      // current instant as a string.
      return currentInstant().toString();
    },
    construct(target, argumentsList, newTarget) {
      // Only the no-argument form asks for the current instant; every explicit
      // construction — a timestamp, an ISO string, a parsed row from the
      // database driver — is left alone.
      return Reflect.construct(
        target,
        argumentsList.length === 0 ? [now()] : argumentsList,
        newTarget,
      );
    },
    get(target, property, receiver) {
      return property === "now" ? now : Reflect.get(target, property, receiver);
    },
  });

  process.on("message", (message) => {
    if (typeof message !== "object" || message === null) {
      return;
    }

    if (message.type === "set-clock") {
      fixedTime = RealDate.parse(message.iso);
      acknowledge(message.id);

      return;
    }

    if (message.type === "reset-clock") {
      fixedTime = null;
      acknowledge(message.id);
    }
  });
}

function acknowledge(id) {
  process.send({ id, type: "clock-ack" });
}
