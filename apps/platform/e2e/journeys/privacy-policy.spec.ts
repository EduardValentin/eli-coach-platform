import { test } from "../support/fixtures";

const CARD_ON_FILE_SENTENCE =
  "To show you which card is on file, we keep the card brand, its last four digits and expiry date as Stripe reports them; the full card number never reaches us.";

test(
  "the privacy policy names the card details kept to show the card on file, in its version 2.1",
  { tag: "@completeness" },
  async ({ privacyPolicy }) => {
    // act
    await privacyPolicy.open();

    // assert
    await privacyPolicy.expectVersion("2.1", "4 October 2026");
    await privacyPolicy.expectSentenceCount(CARD_ON_FILE_SENTENCE, 2);
  },
);
