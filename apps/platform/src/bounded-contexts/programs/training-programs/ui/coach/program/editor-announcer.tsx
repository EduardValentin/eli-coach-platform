import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Announce = (message: string) => void;

const EditorAnnouncerContext = createContext<Announce>(() => {});

export function useAnnouncement() {
  const [message, setMessage] = useState("");
  const announce = useCallback<Announce>((next) => {
    setMessage("");
    requestAnimationFrame(() => setMessage(next));
  }, []);

  return { announce, message };
}

export function AnnouncementRegion({ message }: { message: string }) {
  return (
    <p className="sr-only" role="status">
      {message}
    </p>
  );
}

export function EditorAnnouncerProvider({ children }: { children: ReactNode }) {
  const { announce, message } = useAnnouncement();

  return (
    <EditorAnnouncerContext.Provider value={announce}>
      {children}
      <AnnouncementRegion message={message} />
    </EditorAnnouncerContext.Provider>
  );
}

export function useEditorAnnouncer(): Announce {
  return useContext(EditorAnnouncerContext);
}
