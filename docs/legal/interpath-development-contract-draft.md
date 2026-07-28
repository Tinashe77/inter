# SOFTWARE DEVELOPMENT AGREEMENT

This Software Development Agreement ("Agreement") is made on **[Date]** between:

1. **[Client Legal Name]**, trading as or representing **Interpath - Ultimate Diagnostic Solutions**, of **[Client Address]** ("Client"); and
2. **[Developer Legal Name]**, of **[Developer Address]** ("Developer").

Together, the Client and Developer are the "Parties".

## 1. Project

The Client appoints the Developer to design, develop, test, deploy, and support a secure laboratory results platform for Interpath, including:

- a mobile-first Progressive Web App ("PWA");
- backend services and database integration;
- SLIS MOB / SLISWEB API integration;
- result viewing, PDF result download, WhatsApp sharing, reports, sample collection notification, Covid certificate support, and related modules;
- Android and iOS mobile applications based on the approved PWA codebase.

The working project name is **Interpath Results** or such other name as the Client may approve.

## 2. Scope of Work

The Developer will provide the following services:

- requirements review and technical planning;
- frontend development using React/Vite or an agreed equivalent;
- backend development using Node.js/Express and MongoDB or an agreed equivalent;
- integration with SLIS endpoints supplied or approved by the Client;
- role-based access for Patient, Clinic_Doctor, and Employee users;
- secure authentication, protected routes, session handling, and auto logout;
- patient visits, results, PDF reports, WhatsApp sharing, reports, API testing, and dashboard functionality;
- responsive UI, PWA manifest, service worker, installable app support, loading states, empty states, and error states;
- Android and iOS builds using Capacitor or another agreed wrapper/native approach;
- app icons, splash screens, release builds, and store submission support;
- reasonable deployment documentation and handover.

Any feature not listed above or not agreed in writing is out of scope and may require a separate quotation or change request.

## 3. Deliverables

The expected deliverables are:

- working PWA source code;
- working backend source code;
- configured environment variable examples excluding production secrets;
- Android build package suitable for testing and/or store submission;
- iOS build suitable for TestFlight and/or App Store submission;
- README or deployment notes;
- reasonable bug fixes for issues found during acceptance testing.

## 4. App Store Hosting and Publication

The Parties agree that the Developer will host, publish, and maintain the Android and iOS applications under the Developer's own Google Play Console account and Apple Developer / App Store Connect account, unless the Parties later agree in writing to transfer the applications or publish them under the Client's own accounts.

The Developer will:

- create or manage the app listings under the Developer's store accounts;
- submit builds for review and publication;
- manage app metadata, screenshots, privacy declarations, age ratings, and compliance forms based on information supplied by the Client;
- provide the Client with reasonable visibility of app status, review outcomes, and release progress;
- not materially change the app name, branding, pricing, availability, or description without Client approval.

The Client acknowledges that:

- Apple and Google may impose their own review rules, account requirements, transfer rules, compliance requirements, delays, rejections, or removals;
- store publication is subject to approval by Apple and Google and is not fully controlled by the Developer;
- if the Client later wants the apps transferred to Client-owned store accounts, transfer will depend on Apple and Google policies, eligibility criteria, and account status at that time.

The Developer remains responsible for maintaining good standing of his store accounts and must not intentionally take action that would cause the Interpath apps to be suspended, removed, or made unavailable except where required by law, store policy, security concerns, non-payment, or written Client instruction.

## 5. Client Responsibilities

The Client must provide:

- accurate SLIS API documentation, endpoints, test credentials, production credentials, and technical contacts;
- Interpath logos, brand assets, approved colours, app descriptions, screenshots, and privacy wording where required;
- timely review, feedback, testing, and acceptance decisions;
- lawful authority to process and display patient, clinic, doctor, employee, laboratory, and result data through the system;
- all required legal, regulatory, privacy, and medical disclaimers for app store publication;
- payment according to this Agreement.

The Client is responsible for the accuracy, legality, and authorisation of all medical data, patient data, business content, and app store content supplied to the Developer.

## 6. Fees and Payment

The Client will pay the Developer as follows:

- Total project fee: **[Amount and Currency]**
- Deposit: **[Amount/%]** due on signing
- Milestone 1: **[Amount/%]** due on PWA completion
- Milestone 2: **[Amount/%]** due on backend/API integration completion
- Milestone 3: **[Amount/%]** due on Android/iOS test builds
- Final payment: **[Amount/%]** due before production release or handover

Invoices are payable within **[7/14/30] days** of invoice date. Late payments may pause work, support, deployments, or app submissions until payment is received.

Third-party costs, including hosting, domains, SSL certificates, SMS/WhatsApp services, app store fees, Apple Developer fees, Google Play fees, paid APIs, and cloud services, are excluded unless expressly included in writing.

## 7. Timeline

The estimated timeline is:

- PWA finalisation: **[Timeline]**
- Android build and testing: **[Timeline]**
- iOS build and testing: **[Timeline]**
- Store submission and review: subject to Apple and Google review timelines

Timelines may change if the Client delays feedback, credentials, content, payment, API access, testing, legal approval, or app store information.

## 8. Change Requests

Either Party may request changes. The Developer may charge additional fees or extend timelines for changes that:

- add new features;
- change approved designs or workflows;
- require additional SLIS API work;
- require new native mobile functionality;
- require major rework due to changed requirements;
- arise from third-party API, hosting, or app store changes.

Changes should be documented by email, message, quotation, or signed change order.

## 9. Acceptance Testing

The Client will test each deliverable within **[5/7/10] business days** of delivery. If the Client identifies defects, the Developer will correct confirmed defects within the agreed scope.

A deliverable is deemed accepted if:

- the Client confirms acceptance in writing;
- the Client uses it in production;
- the Client does not provide written rejection with specific defects within the review period.

## 10. Intellectual Property

Subject to full payment of all amounts due:

- the Client owns the final custom application code, custom UI, custom workflows, and project-specific deliverables created specifically for the Client;
- the Developer retains ownership of pre-existing tools, libraries, reusable components, methods, templates, know-how, and general development experience;
- open-source and third-party software remains governed by its respective licence;
- app store accounts remain owned by the Developer unless separately transferred or agreed in writing.

Until full payment is received, the Developer grants the Client only a limited, revocable licence to test and review the deliverables.

## 11. Confidentiality

The Parties must keep confidential all non-public business, technical, medical, patient, API, credential, source code, pricing, and operational information relating to the Project. The Parties may also sign a separate Non-Disclosure Agreement. If there is a conflict, the stricter confidentiality obligation applies.

## 12. Data Protection and Security

The Developer will use reasonable technical and organisational measures to protect the application and data, including:

- secure environment variables for credentials;
- no intentional hardcoding of production secrets in public repositories;
- role-based access controls;
- HTTPS in production;
- secure session handling;
- audit logging where implemented;
- confirmation before sharing patient result links through WhatsApp;
- avoiding permanent storage of medical results on user devices unless approved.

The Client remains responsible for confirming that the system, workflows, privacy notices, medical disclaimers, data retention, and patient communication methods comply with applicable law and Client policies.

## 13. Hosting, Maintenance, and Support

Unless otherwise agreed, this Agreement covers development and initial deployment only. Ongoing maintenance, hosting management, monitoring, bug fixes after acceptance, app store updates, OS compatibility updates, security patches, and SLIS API change support require a separate maintenance agreement or hourly billing.

Suggested maintenance terms:

- Monthly maintenance fee: **[Amount]**
- Included support hours: **[Hours]**
- Extra hourly rate: **[Rate]**
- Response time: **[Response Time]**

## 14. Warranties

The Developer warrants that services will be performed with reasonable skill and care. The Developer does not warrant that:

- SLIS or third-party APIs will always be available or error-free;
- Apple or Google will approve the apps;
- the application will be uninterrupted or completely free of bugs;
- the system will meet legal or medical compliance requirements unless expressly agreed and reviewed by qualified professionals.

## 15. Limitation of Liability

To the maximum extent permitted by law, neither Party is liable for indirect, special, consequential, punitive, or loss-of-profit damages.

The Developer's total liability under this Agreement is limited to the fees actually paid to the Developer under this Agreement in the **[3/6/12] months** before the claim, except for fraud, wilful misconduct, or liabilities that cannot legally be limited.

## 16. Suspension and Termination

The Developer may suspend work, deployments, support, or app submissions if the Client fails to pay, fails to provide required information, misuses the system, or requests unlawful processing of data.

Either Party may terminate this Agreement by written notice if the other Party materially breaches the Agreement and does not remedy the breach within **[10/14/30] days** of notice.

On termination:

- the Client must pay for all completed work and approved expenses up to the termination date;
- the Developer must provide completed paid-for deliverables in their current state;
- unpaid work remains owned by the Developer;
- confidentiality, payment, IP, limitation of liability, and dispute clauses survive termination.

## 17. Independent Contractor

The Developer is an independent contractor and not an employee, partner, agent, or joint venture partner of the Client.

## 18. Dispute Resolution

The Parties will first attempt to resolve disputes through good-faith discussion. If unresolved, the dispute may be referred to mediation or arbitration in **[Jurisdiction]**, unless urgent court relief is required.

## 19. Governing Law

This Agreement is governed by the laws of **[Jurisdiction]**. The courts of **[Jurisdiction/Courts]** have jurisdiction, unless the Parties agree otherwise in writing.

## 20. Entire Agreement

This Agreement, together with any signed proposal, invoice, statement of work, change request, or NDA, is the entire agreement between the Parties for the Project.

## 21. Signatures

Signed for and on behalf of **[Client Legal Name]**:

Name: _______________________________

Title: _______________________________

Signature: ____________________________

Date: ________________________________

Signed by **[Developer Legal Name]**:

Name: _______________________________

Signature: ____________________________

Date: ________________________________

