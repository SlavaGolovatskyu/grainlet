import {
  COOKIES_POLICY_URL,
  LEGAL_ADDRESS,
  LEGAL_CONTACT_EMAILS,
  LEGAL_SITE_URL,
} from './legalShared.js';

const contactEmailsText = `${LEGAL_CONTACT_EMAILS[0]} or ${LEGAL_CONTACT_EMAILS[1]}`;

export const PRIVACY_INTRO_TITLE = 'PRIVACY POLICY';

export const PRIVACY_INTRO_LEAD = `This Privacy Notice for Zenwayro ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:`;

export const PRIVACY_INTRO_CLOSING = `Questions or concerns? Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at ${contactEmailsText}.`;

export const PRIVACY_INTRO_LIST_ITEMS = [
  `Visit our website at ${LEGAL_SITE_URL} or any website of ours that links to this Privacy Notice`,
  'Use Zenwayro. A travel itinerary platform that you can use to organize your perfect trip without hassle.',
  'Engage with us in other related ways, including any marketing or events',
];

export const PRIVACY_CONTACT_MAIL_BLOCK = `Zenwayro\n${LEGAL_ADDRESS}\n${LEGAL_CONTACT_EMAILS[0]}\n${LEGAL_CONTACT_EMAILS[1]}`;

export const PRIVACY_SUMMARY_TITLE = 'SUMMARY OF KEY POINTS';

export const PRIVACY_SUMMARY_PARAGRAPHS = [
  'This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.',
  'What personal information do we process? When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.',
  'Do we process any sensitive personal information? Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We do not process sensitive personal information.',
  'Do we collect any information from third parties? We do not collect any information from third parties.',
  'How do we process your information? We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.',
  'In what situations and with which parties do we share personal information? We may share information in specific situations and with specific third parties. Learn more about when and with whom we share your personal information.',
  'How do we keep your information safe? We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about how we keep your information safe.',
  'What are your rights? Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.',
  'How do you exercise your rights? The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.',
  'Want to learn more about what we do with any information we collect? Review the Privacy Notice in full.',
];

const email = LEGAL_CONTACT_EMAILS[0];
const emailBoth = `${LEGAL_CONTACT_EMAILS[0]} or ${LEGAL_CONTACT_EMAILS[1]}`;

const US_STATE_CATEGORIES_TABLE = {
  type: 'table',
  headers: ['Category', 'Examples', 'Collected'],
  rows: [
    [
      'A. Identifiers\nContact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name',
      '',
      'YES',
    ],
    [
      'B. Personal information as defined in the California Customer Records statute\nName, contact information, education, employment, employment history, and financial information',
      '',
      'YES',
    ],
    [
      'C. Protected classification characteristics under state or federal law\nGender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data',
      '',
      'NO',
    ],
    [
      'D. Commercial information\nTransaction information, purchase history, financial details, and payment information',
      '',
      'NO',
    ],
    ['E. Biometric information\nFingerprints and voiceprints', '', 'NO'],
    [
      'F. Internet or other similar network activity\nBrowsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements',
      '',
      'NO',
    ],
    ['G. Geolocation data\nDevice location', '', 'NO'],
    [
      'H. Audio, electronic, sensory, or similar information\nImages and audio, video or call recordings created in connection with our business activities',
      '',
      'NO',
    ],
    [
      'I. Professional or employment-related information\nBusiness contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us',
      '',
      'NO',
    ],
    ['J. Education Information\nStudent records and directory information', '', 'NO'],
    [
      'K. Inferences drawn from collected personal information\nInferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual\'s preferences and characteristics',
      '',
      'NO',
    ],
    ['L. Sensitive personal Information', '', 'NO'],
  ],
};

export const PRIVACY_SECTIONS = [
  {
    id: 'section-1',
    number: 1,
    title: 'WHAT INFORMATION DO WE COLLECT?',
    blocks: [
      { type: 'subheading', text: 'Personal information you disclose to us' },
      { type: 'paragraph', text: 'In Short: We collect personal information that you provide to us.' },
      {
        type: 'paragraph',
        text: 'We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.',
      },
      {
        type: 'paragraph',
        text: 'Personal Information Provided by You. The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:',
      },
      {
        type: 'list',
        items: ['names', 'email addresses', 'passwords'],
      },
      { type: 'paragraph', text: 'Sensitive Information. We do not process sensitive information.' },
      {
        type: 'paragraph',
        text: 'All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.',
      },
      { type: 'subheading', text: 'Google API' },
      {
        type: 'paragraph',
        text: 'Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.',
      },
    ],
  },
  {
    id: 'section-2',
    number: 2,
    title: 'HOW DO WE PROCESS YOUR INFORMATION?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We process the personal information for the following purposes listed below. We may also process your information for other purposes only with your prior explicit consent.',
      },
      {
        type: 'paragraph',
        text: 'We process your personal information for a variety of reasons, depending on how you interact with our Services, including:',
      },
      {
        type: 'list',
        items: [
          'To facilitate account creation and authentication and otherwise manage user accounts. We may process your information so you can create and log in to your account, as well as keep your account in working order.',
          'To deliver and facilitate delivery of services to the user. We may process your information to provide you with the requested service.',
          'To send administrative information to you. We may process your information to send you details about our products and services, changes to our terms and policies, and other similar information.',
          'To save or protect an individual\'s vital interest. We may process your information when necessary to save or protect an individual\'s vital interest, such as to prevent harm.',
        ],
      },
    ],
  },
  {
    id: 'section-3',
    number: 3,
    title: 'WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.',
      },
      { type: 'paragraph', text: 'If you are located in the EU or UK, this section applies to you.' },
      {
        type: 'paragraph',
        text: 'The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:',
      },
      {
        type: 'list',
        items: [
          'Consent. We may process your information if you have given us permission (i.e., consent) to use your personal information for a specific purpose. You can withdraw your consent at any time.',
          'Performance of a Contract. We may process your personal information when we believe it is necessary to fulfill our contractual obligations to you, including providing our Services or at your request prior to entering into a contract with you.',
          'Legal Obligations. We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.',
          'Vital Interests. We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.',
        ],
      },
      { type: 'paragraph', text: 'If you are located in Canada, this section applies to you.' },
      {
        type: 'paragraph',
        text: 'We may process your information if you have given us specific permission (i.e., express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e., implied consent). You can withdraw your consent at any time.',
      },
      {
        type: 'paragraph',
        text: 'In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including, for example:',
      },
      {
        type: 'list',
        items: [
          'If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way',
          'For investigations and fraud detection and prevention',
          'For business transactions provided certain conditions are met',
          'If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim',
          'For identifying injured, ill, or deceased persons and communicating with next of kin',
          'If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse',
          'If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province',
          'If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records',
          'If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes for which the information was produced',
          'If the collection is solely for journalistic, artistic, or literary purposes',
          'If the information is publicly available and is specified by the regulations',
          'We may disclose de-identified information for approved research or statistics projects, subject to ethics oversight and confidentiality commitments',
        ],
      },
    ],
  },
  {
    id: 'section-4',
    number: 4,
    title: 'WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We may share information in specific situations described in this section and/or with the following third parties.',
      },
      {
        type: 'paragraph',
        text: 'We may need to share your personal information in the following situations:',
      },
      {
        type: 'list',
        items: [
          'Business Transfers. We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.',
          'When we use Google Maps Platform APIs. We may share your information with certain Google Maps Platform APIs (e.g., Google Maps API, Places API). Google Maps uses GPS, Wi-Fi, and cell towers to estimate your location. GPS is accurate to about 20 meters, while Wi-Fi and cell towers help improve accuracy when GPS signals are weak, like indoors. This data helps Google Maps provide directions, but it is not always perfectly precise.',
        ],
      },
    ],
  },
  {
    id: 'section-5',
    number: 5,
    title: 'DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We may use cookies and other tracking technologies to collect and store your information.',
      },
      {
        type: 'paragraph',
        text: 'We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.',
      },
      {
        type: 'paragraph',
        text: 'We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, to tailor advertisements to your interests, or to send abandoned shopping cart reminders (depending on your communication preferences). The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear either on our Services or on other websites. If you configure X (Twitter) ads with Google Campaign Manager measurement tags, X may transmit data regarding your campaigns to Google Campaign Manager as described in X’s advertising terms.',
      },
      {
        type: 'paragraph',
        text: 'To the extent these online tracking technologies are deemed to be a "sale"/"sharing" (which includes targeted advertising, as defined under the applicable laws) under applicable US state laws, you can opt out of these online tracking technologies by submitting a request as described below under section "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"',
      },
      {
        type: 'paragraph',
        text: `Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Policy: ${COOKIES_POLICY_URL}.`,
      },
    ],
  },
  {
    id: 'section-6',
    number: 6,
    title: 'HOW LONG DO WE KEEP YOUR INFORMATION?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.',
      },
      {
        type: 'paragraph',
        text: 'We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.',
      },
      {
        type: 'paragraph',
        text: 'When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.',
      },
    ],
  },
  {
    id: 'section-7',
    number: 7,
    title: 'HOW DO WE KEEP YOUR INFORMATION SAFE?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We aim to protect your personal information through a system of organizational and technical security measures.',
      },
      {
        type: 'paragraph',
        text: 'We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.',
      },
    ],
  },
  {
    id: 'section-8',
    number: 8,
    title: 'DO WE COLLECT INFORMATION FROM MINORS?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: We do not knowingly collect data from or market to children under 18 years of age or the equivalent age as specified by law in your jurisdiction.',
      },
      {
        type: 'paragraph',
        text: `We do not knowingly collect, solicit data from, or market to children under 18 years of age or the equivalent age as specified by law in your jurisdiction, nor do we knowingly sell such personal information. By using the Services, you represent that you are at least 18 or the equivalent age as specified by law in your jurisdiction or that you are the parent or guardian of such a minor and consent to such minor dependent's use of the Services. If we learn that personal information from users less than 18 years of age or the equivalent age as specified by law in your jurisdiction has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18 or the equivalent age as specified by law in your jurisdiction, please contact us at ${email}.`,
      },
    ],
  },
  {
    id: 'section-9',
    number: 9,
    title: 'WHAT ARE YOUR PRIVACY RIGHTS?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.',
      },
      {
        type: 'paragraph',
        text: 'In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making. If a decision that produces legal or similarly significant effects is made solely by automated means, we will inform you, explain the main factors, and offer a simple way to request human review. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.',
      },
      {
        type: 'paragraph',
        text: 'We will consider and act upon any request in accordance with applicable data protection laws.',
      },
      {
        type: 'paragraph',
        text: 'If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your Member State data protection authority or UK data protection authority.',
      },
      {
        type: 'paragraph',
        text: 'If you are located in Switzerland, you may contact the Federal Data Protection and Information Commissioner.',
      },
      {
        type: 'paragraph',
        text: 'Withdrawing your consent: If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.',
      },
      {
        type: 'paragraph',
        text: 'However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.',
      },
      { type: 'subheading', text: 'Account Information' },
      {
        type: 'paragraph',
        text: 'If you would at any time like to review or change the information in your account or terminate your account, you can:',
      },
      {
        type: 'list',
        items: [
          'Log in to your account settings and update your user account.',
          'Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.',
        ],
      },
      {
        type: 'paragraph',
        text: `If you have questions or comments about your privacy rights, you may email us at ${email}.`,
      },
    ],
  },
  {
    id: 'section-10',
    number: 10,
    title: 'CONTROLS FOR DO-NOT-TRACK FEATURES',
    blocks: [
      {
        type: 'paragraph',
        text: 'Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.',
      },
      {
        type: 'paragraph',
        text: 'California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.',
      },
    ],
  },
  {
    id: 'section-11',
    number: 11,
    title: 'DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Maryland, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Rhode Island, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. More information is provided below.',
      },
      { type: 'subheading', text: 'Categories of Personal Information We Collect' },
      {
        type: 'paragraph',
        text: 'The table below shows the categories of personal information we have collected in the past twelve (12) months. The table includes illustrative examples of each category and does not reflect the personal information we collect from you. For a comprehensive inventory of all personal information we process, please refer to the section "WHAT INFORMATION DO WE COLLECT?"',
      },
      US_STATE_CATEGORIES_TABLE,
      {
        type: 'paragraph',
        text: 'We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:',
      },
      {
        type: 'list',
        items: [
          'Receiving help through our customer support channels;',
          'Participation in customer surveys or contests; and',
          'Facilitation in the delivery of our Services and to respond to your inquiries.',
        ],
      },
      {
        type: 'paragraph',
        text: 'We will use and retain the collected personal information as needed to provide the Services or for:',
      },
      {
        type: 'list',
        items: [
          'Category A - As long as the user has an account with us',
          'Category B - As long as the user has an account with us',
          'Category H - As long as the user has an account with us',
        ],
      },
      { type: 'subheading', text: 'Sources of Personal Information' },
      {
        type: 'paragraph',
        text: 'Learn more about the sources of personal information we collect in "WHAT INFORMATION DO WE COLLECT?"',
      },
      { type: 'subheading', text: 'How We Use and Share Personal Information' },
      {
        type: 'paragraph',
        text: 'Learn more about how we use your personal information in the section, "HOW DO WE PROCESS YOUR INFORMATION?"',
      },
      { type: 'subheading', text: 'Will your information be shared with anyone else?' },
      {
        type: 'paragraph',
        text: 'We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Learn more about how we disclose personal information to in the section, "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"',
      },
      {
        type: 'paragraph',
        text: 'We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.',
      },
      {
        type: 'paragraph',
        text: 'We have not disclosed, sold, or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We will not sell or share personal information in the future belonging to website visitors, users, and other consumers.',
      },
      { type: 'subheading', text: 'Your Rights' },
      {
        type: 'paragraph',
        text: 'You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:',
      },
      {
        type: 'list',
        items: [
          'Right to know whether or not we are processing your personal data',
          'Right to access your personal data',
          'Right to correct inaccuracies in your personal data',
          'Right to request the deletion of your personal data',
          'Right to obtain a copy of the personal data you previously shared with us',
          'Right to non-discrimination for exercising your rights',
          'Right to opt out of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California\'s privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")',
        ],
      },
      {
        type: 'paragraph',
        text: 'Depending upon the state where you live, you may also have the following rights:',
      },
      {
        type: 'list',
        items: [
          'Right to access the categories of personal data being processed (as permitted by applicable law, including the privacy law in Minnesota)',
          'Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in California, Delaware, and Maryland)',
          'Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including the privacy law in Minnesota and Oregon)',
          'Right to obtain a list of third parties to which we have sold personal data (as permitted by applicable law, including the privacy law in Connecticut)',
          'Right to review, understand, question, and depending on where you live, correct how personal data has been profiled (as permitted by applicable law, including the privacy law in Connecticut and Minnesota)',
          'Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including the privacy law in California)',
          'Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including the privacy law in Florida)',
        ],
      },
      { type: 'subheading', text: 'How to Exercise Your Rights' },
      {
        type: 'paragraph',
        text: `To exercise these rights, you can contact us by submitting a data subject access request, by emailing us at ${email}, or by referring to the contact details at the bottom of this document.`,
      },
      {
        type: 'paragraph',
        text: 'Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.',
      },
      { type: 'subheading', text: 'Request Verification' },
      {
        type: 'paragraph',
        text: 'Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.',
      },
      {
        type: 'paragraph',
        text: 'If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request and the agent will need to provide a written and signed permission from you to submit such request on your behalf.',
      },
      { type: 'subheading', text: 'Appeals' },
      {
        type: 'paragraph',
        text: `Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at ${email}. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney general.`,
      },
      { type: 'subheading', text: 'California "Shine The Light" Law' },
      {
        type: 'paragraph',
        text: 'California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?"',
      },
    ],
  },
  {
    id: 'section-12',
    number: 12,
    title: 'GOOGLE USER DATA - DATA ACCESSED',
    blocks: [
      {
        type: 'paragraph',
        text: 'When you sign in with Google or link your Google account, we request the following data through Google OAuth 2.0: Basic Profile Information (via openid, userinfo.email, and userinfo.profile scopes) including your Google account email address, full name, and email verification status. Google Calendar Events (via calendar.events scope) are only requested when you explicitly initiate a calendar export to create events in your Google Calendar. This scope is not required for general use of the application.',
      },
    ],
  },
  {
    id: 'section-13',
    number: 13,
    title: 'GOOGLE USER DATA - DATA USAGE',
    blocks: [
      {
        type: 'paragraph',
        text: 'We use Google user data solely for authentication and calendar export. Your Google email and name are used to create and identify your Zenwayro account, allowing you to sign in without a separate password. When you choose to export a trip itinerary, we use calendar access to create events in your Google Calendar that correspond to your trip schedule. We only write events and do not read or modify your existing calendar data. We do not use Google user data for advertising, analytics, or any purpose unrelated to these features.',
      },
    ],
  },
  {
    id: 'section-14',
    number: 14,
    title: 'GOOGLE USER DATA - DATA STORAGE',
    blocks: [
      {
        type: 'paragraph',
        text: 'Your Google account email and unique identifier are stored in our database to maintain your account link. OAuth access and refresh tokens are encrypted at rest using AES-128 encryption and stored securely in our database. These tokens are used only to perform the actions you have authorized. We do not store the contents of your Google Calendar or any Google data beyond what is listed above.',
      },
    ],
  },
  {
    id: 'section-15',
    number: 15,
    title: 'GOOGLE USER DATA - DATA SHARING',
    blocks: [
      {
        type: 'paragraph',
        text: 'We do not sell, share, or transfer your Google user data to any third parties. Google user data is only transmitted between your browser, Google\'s servers, and our servers as part of the OAuth authentication flow and calendar export feature.',
      },
    ],
  },
  {
    id: 'section-16',
    number: 16,
    title: 'GOOGLE USER DATA - DATA RETENTION AND DELETION',
    blocks: [
      {
        type: 'paragraph',
        text: 'You can unlink your Google account at any time from your account settings. When you unlink, we revoke all tokens with Google and delete them from our database. If you delete your Zenwayro account, all associated Google OAuth data is permanently deleted and tokens are revoked with Google. You can also revoke Zenwayro\'s access at any time from your Google Account permissions page at myaccount.google.com/permissions.',
      },
    ],
  },
  {
    id: 'section-17',
    number: 17,
    title: 'DO WE MAKE UPDATES TO THIS NOTICE?',
    blocks: [
      {
        type: 'paragraph',
        text: 'In Short: Yes, we will update this notice as necessary to stay compliant with relevant laws.',
      },
      {
        type: 'paragraph',
        text: 'We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.',
      },
    ],
  },
  {
    id: 'section-18',
    number: 18,
    title: 'HOW CAN YOU CONTACT US ABOUT THIS NOTICE?',
    blocks: [
      {
        type: 'paragraph',
        text: `If you have questions or comments about this notice, you may email us at ${emailBoth} or contact us by post at:`,
      },
      { type: 'paragraph', text: PRIVACY_CONTACT_MAIL_BLOCK },
    ],
  },
  {
    id: 'section-19',
    number: 19,
    title: 'HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?',
    blocks: [
      {
        type: 'paragraph',
        text: 'Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please fill out and submit a data subject access request.',
      },
    ],
  },
];

