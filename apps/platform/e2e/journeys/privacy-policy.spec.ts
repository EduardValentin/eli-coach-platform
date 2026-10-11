import { test } from "../support/fixtures";

const CARD_ON_FILE_SENTENCE =
  "To show you which card is on file, we keep the card brand, its last four digits and expiry date as Stripe reports them; the full card number never reaches us.";

test(
  "the privacy policy names the card details kept to show the card on file, in its version 2.2",
  { tag: "@completeness" },
  async ({ privacyPolicy }) => {
    // act
    await privacyPolicy.open();

    // assert
    await privacyPolicy.expectVersion("2.2", "11 October 2026");
    await privacyPolicy.expectSentenceCount(CARD_ON_FILE_SENTENCE, 2);
  },
);

test(
  "the privacy policy tells a client what the platform keeps of her measurements, photos and the files her coach shares",
  { tag: "@completeness" },
  async ({ privacyPolicy }) => {
    // act
    await privacyPolicy.open();

    // assert
    await privacyPolicy.expectSection(
      "Body measurements, progress photos, and shared files",
    );
    await privacyPolicy.expectDataEntry(
      "Body measurements and progress photos",
    );
    await privacyPolicy.expectDataEntry("Files shared by your coach");
  },
);
