import { act } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;

export async function writeRichText(user: User, textbox: HTMLElement, text: string) {
  await user.click(textbox);
  await act(async () => {
    textbox.dispatchEvent(new InputEvent('input', { data: text, inputType: 'insertText', bubbles: true }));
  });
}

export async function clearRichText(user: User, textbox: HTMLElement) {
  await user.click(textbox);
  await user.keyboard('{Control>}a{/Control}{Backspace}');
}
