import {
  LEGAL_ADDRESS,
  LEGAL_CONTACT_EMAILS,
  LEGAL_SITE_URL,
} from './legalShared.js';

export const COOKIES_INTRO_TITLE = 'COOKIE POLICY';

export const COOKIES_INTRO_PARAGRAPHS = [
  `This Cookie Policy explains how Zenwayro ("Company," "we," "us," and "our") uses cookies and similar technologies to recognize you when you visit our website at ${LEGAL_SITE_URL} ("Website"). It explains what these technologies are and why we use them, as well as your rights to control our use of them.`,
  'In some cases we may use cookies to collect personal information, or that becomes personal information if we combine it with other information.',
];

const contactBlock = `Zenwayro\n${LEGAL_ADDRESS}\n${LEGAL_CONTACT_EMAILS[0]}\n${LEGAL_CONTACT_EMAILS[1]}`;

const COOKIE_INVENTORY_TABLE = {
  type: 'table',
  headers: ['Name', 'Provider', 'Purpose', 'Type', 'Duration'],
  rows: [
    [
      'next-auth.session-token (or equivalent)',
      'Zenwayro',
      'Authentication and session management',
      'Essential',
      'Session',
    ],
    [
      '__Secure-next-auth.session-token (when applicable)',
      'Zenwayro',
      'Secure authentication session',
      'Essential',
      'Session',
    ],
    ['_ga', 'Google Analytics', 'Distinguish users for analytics', 'Analytics', '2 years'],
    ['_gid', 'Google Analytics', 'Distinguish users for analytics', 'Analytics', '24 hours'],
    ['_gat', 'Google Analytics', 'Throttle request rate', 'Analytics', '1 minute'],
    [
      'muc_ads / personalization_id (or similar)',
      'X (Twitter)',
      'Advertising and conversion measurement when X Pixel is enabled',
      'Advertising',
      'Varies',
    ],
    [
      '_fbp / _fbc (or similar)',
      'Meta (Facebook/Instagram)',
      'Advertising and conversion measurement when Meta Pixel is enabled',
      'Advertising',
      'Varies',
    ],
    [
      '_clck / _clsk',
      'Microsoft Clarity',
      'Session replay and heatmap analytics when Clarity is enabled',
      'Analytics',
      'Varies',
    ],
  ],
};

export const COOKIES_SECTIONS = [
  {
    id: 'what-are-cookies',
    title: 'What are cookies?',
    blocks: [
      {
        type: 'paragraph',
        text: 'Cookies are small data files that are placed on your computer or mobile device when you visit a website. Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, as well as to provide reporting information.',
      },
      {
        type: 'paragraph',
        text: 'Cookies set by the website owner (in this case, Zenwayro) are called "first-party cookies." Cookies set by parties other than the website owner are called "third-party cookies." Third-party cookies enable third-party features or functionality to be provided on or through the website (e.g., advertising, interactive content, and analytics). The parties that set these third-party cookies can recognize your computer both when it visits the website in question and also when it visits certain other websites.',
      },
    ],
  },
  {
    id: 'why-we-use',
    title: 'Why do we use cookies?',
    blocks: [
      {
        type: 'paragraph',
        text: 'We use first- and third-party cookies for several reasons. Some cookies are required for technical reasons in order for our Website to operate, and we refer to these as "essential" or "strictly necessary" cookies. Other cookies also enable us to track and target the interests of our users to enhance the experience on our Online Properties. Third parties serve cookies through our Website for advertising, analytics, and other purposes. This is described in more detail below.',
      },
    ],
  },
  {
    id: 'how-to-control',
    title: 'How can I control cookies?',
    blocks: [
      {
        type: 'paragraph',
        text: 'You have the right to decide whether to accept or reject cookies. You can exercise your cookie rights by setting your preferences in your web browser. Essential cookies cannot be rejected if you wish to use sign-in and other account features, as they are strictly necessary to provide you with those services.',
      },
      {
        type: 'paragraph',
        text: 'If you choose to reject non-essential cookies, you may still use our Website though your access to some functionality and areas of our Website may be restricted. You may set or amend your web browser controls to accept or refuse cookies at any time.',
      },
      {
        type: 'paragraph',
        text: 'The specific types of first- and third-party cookies served through our Website and the purposes they perform are described in the table below (please note that the specific cookies served may vary depending on the specific Online Properties you visit). Analytics cookies are used only when Google Analytics is enabled for our Website (via NEXT_PUBLIC_GA_MEASUREMENT_ID). Google Ads sign-up conversion events are sent via gtag when NEXT_PUBLIC_GA_EVENT_SIGNUP is configured. Microsoft Clarity session replay and heatmap cookies are used only when Clarity is enabled (via NEXT_PUBLIC_CLARITY_PROJECT_ID). Advertising and conversion cookies from X (Twitter) are used only when the X Pixel is enabled (via NEXT_PUBLIC_X_PIXEL_ID). Meta (Facebook/Instagram) advertising cookies are used only when the Meta Pixel is enabled (via NEXT_PUBLIC_META_PIXEL_ID). Theme and language preferences are stored in local storage, not cookies.',
      },
      COOKIE_INVENTORY_TABLE,
    ],
  },
  {
    id: 'browser-controls',
    title: 'How can I control cookies on my browser?',
    blocks: [
      {
        type: 'paragraph',
        text: "As the means by which you can refuse cookies through your web browser controls vary from browser to browser, you should visit your browser's help menu for more information. The following is information about how to manage cookies on the most popular browsers:",
      },
      {
        type: 'list',
        items: ['Chrome', 'Internet Explorer', 'Firefox', 'Safari', 'Edge', 'Opera'],
      },
      {
        type: 'paragraph',
        text: 'In addition, most advertising networks offer you a way to opt out of targeted advertising. If you would like to find out more information, please visit: https://optout.aboutads.info/ (Digital Advertising Alliance), https://youradchoices.ca/ (Digital Advertising Alliance of Canada), and https://www.youronlinechoices.com/ (European Interactive Digital Advertising Alliance).',
      },
    ],
  },
  {
    id: 'other-tracking',
    title: 'What about other tracking technologies, like web beacons?',
    blocks: [
      {
        type: 'paragraph',
        text: 'Cookies are not the only way to recognize or track visitors to a website. We may use other, similar technologies from time to time, like web beacons (sometimes called "tracking pixels" or "clear gifs"). These are tiny graphics files that contain a unique identifier that enables us to recognize when someone has visited our Website or opened an email including them. This allows us, for example, to monitor the traffic patterns of users from one page within a website to another, to deliver or communicate with cookies, to understand whether you have come to the website from an online advertisement displayed on a third-party website, to improve site performance, and to measure the success of email marketing campaigns. In many instances, these technologies are reliant on cookies to function properly, and so declining cookies will impair their functioning.',
      },
    ],
  },
  {
    id: 'flash-cookies',
    title: 'Do you use Flash cookies or Local Shared Objects?',
    blocks: [
      {
        type: 'paragraph',
        text: 'Websites may also use so-called "Flash Cookies" (also known as Local Shared Objects or "LSOs") to, among other things, collect and store information about your use of our services, fraud prevention, and for other site operations.',
      },
      {
        type: 'paragraph',
        text: 'If you do not want Flash Cookies stored on your computer, you can adjust the settings of your Flash player to block Flash Cookies storage using the tools contained in the Website Storage Settings Panel. You can also control Flash Cookies by going to the Global Storage Settings Panel and following the instructions (which may include instructions that explain, for example, how to delete existing Flash Cookies (referred to "information" on the Macromedia site), how to prevent Flash LSOs from being placed on your computer without your being asked, and (for Flash Player 8 and later) how to block Flash Cookies that are not being delivered by the operator of the page you are on at the time).',
      },
      {
        type: 'paragraph',
        text: 'Please note that setting the Flash Player to restrict or limit acceptance of Flash Cookies may reduce or impede the functionality of some Flash applications, including, potentially, Flash applications used in connection with our services or online content.',
      },
    ],
  },
  {
    id: 'targeted-advertising',
    title: 'Do you serve targeted advertising?',
    blocks: [
      {
        type: 'paragraph',
        text: 'Third parties may serve cookies on your computer or mobile device to serve advertising through our Website. These companies may use information about your visits to this and other websites in order to provide relevant advertisements about goods and services that you may be interested in. They may also employ technology that is used to measure the effectiveness of advertisements. They can accomplish this by using cookies or web beacons to collect information about your visits to this and other sites in order to provide relevant advertisements about goods and services of potential interest to you. The information collected through this process does not enable us or them to identify your name, contact details, or other details that directly identify you unless you choose to provide these.',
      },
    ],
  },
  {
    id: 'updates',
    title: 'How often will you update this Cookie Policy?',
    blocks: [
      {
        type: 'paragraph',
        text: 'We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.',
      },
      {
        type: 'paragraph',
        text: 'The date at the top of this Cookie Policy indicates when it was last updated.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Where can I get further information?',
    blocks: [
      {
        type: 'paragraph',
        text: `If you have any questions about our use of cookies or other technologies, please email us at ${LEGAL_CONTACT_EMAILS[0]} or ${LEGAL_CONTACT_EMAILS[1]}, or contact us by post at:`,
      },
      { type: 'paragraph', text: contactBlock },
    ],
  },
];

