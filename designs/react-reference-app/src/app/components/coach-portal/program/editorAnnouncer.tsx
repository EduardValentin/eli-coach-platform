import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Announce = (message: string) => void;

const EditorAnnouncerContext = createContext<Announce>(() => {});

export function EditorAnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useCallback<Announce>(next => {
    setMessage('');
    requestAnimationFrame(() => setMessage(next));
  }, []);

  return (
    <EditorAnnouncerContext.Provider value={announce}>
      {children}
      <p role="status" className="sr-only">
        {message}
      </p>
    </EditorAnnouncerContext.Provider>
  );
}

export function useEditorAnnouncer(): Announce {
  return useContext(EditorAnnouncerContext);
}
