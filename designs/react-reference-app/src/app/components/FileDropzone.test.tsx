import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FileDropzone, FilePickerButton } from './FileDropzone';

const PROMPT = 'Drop a file here or choose one';
const HINT = 'PDF or image · up to 25 MB';

function plan(): File {
  return new File(['plan'], 'plan.pdf', { type: 'application/pdf' });
}

function renderZone() {
  const onFileChosen = vi.fn();
  render(
    <FileDropzone accept=".pdf" hint={HINT} onFileChosen={onFileChosen} prompt={PROMPT} />,
  );

  return onFileChosen;
}

describe('FileDropzone', () => {
  it('names its file input by the prompt and describes it with the hint', () => {
    // arrange
    renderZone();

    // act
    const input = screen.getByLabelText(PROMPT);

    // assert
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAccessibleDescription(HINT);
  });

  it('hands over the file chosen through the picker', async () => {
    // arrange
    const onFileChosen = renderZone();
    const file = plan();

    // act
    await userEvent.upload(screen.getByLabelText(PROMPT), file);

    // assert
    expect(onFileChosen).toHaveBeenCalledWith(file);
  });

  it('shows the drag-over state while a file is held over it', () => {
    // arrange
    renderZone();
    const zone = screen.getByText(PROMPT).closest('label') as HTMLElement;

    // act
    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });

    // assert
    expect(zone).toHaveAttribute('data-dragging');
  });

  it('hands over a dropped file', () => {
    // arrange
    const onFileChosen = renderZone();
    const zone = screen.getByText(PROMPT).closest('label') as HTMLElement;
    const file = plan();

    // act
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });

    // assert
    expect(onFileChosen).toHaveBeenCalledWith(file);
    expect(zone).not.toHaveAttribute('data-dragging');
  });
});

describe('FilePickerButton', () => {
  it('opens the same native picker under its own label', async () => {
    // arrange
    const onFileChosen = vi.fn();
    render(
      <FilePickerButton accept=".pdf" onFileChosen={onFileChosen}>
        Replace
      </FilePickerButton>,
    );
    const file = plan();

    // act
    await userEvent.upload(screen.getByLabelText('Replace'), file);

    // assert
    expect(onFileChosen).toHaveBeenCalledWith(file);
  });
});
