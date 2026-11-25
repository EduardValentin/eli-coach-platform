import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Announce = (message: string) => void;

const EditorAnnouncerContext = createContext<Announce>(() => {});

export function useAnnouncement() {
  const [message, setMessage] = useState('');
  const announce = useCallback<Announce>(next => {
    setMessage('');
    requestAnimationFrame(() => setMessage(next));
  }, []);

  return { message, announce };
}

export function AnnouncementRegion({ message }: { message: string }) {
  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}

export function EditorAnnouncerProvider({ children }: { children: ReactNode }) {
  const { message, announce } = useAnnouncement();

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
