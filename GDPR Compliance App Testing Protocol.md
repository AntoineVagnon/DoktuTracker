

# **Technical Compliance and Audit Protocol for GDPR-Compliant Applications**

## **I. Foundational Compliance Mandate: Embedding GDPR into the Software Development Lifecycle (SDLC)**

Compliance under the General Data Protection Regulation (GDPR) is fundamentally a requirement of accountability, as stipulated in Article 5(2). For application developers, this mandates the integration of data protection principles directly into the software development lifecycle (SDLC) through verifiable mechanisms. The primary instruments for demonstrating and governing this accountability are the Data Protection Impact Assessment (DPIA) and the Records of Processing Activities (ROPA). These documents must be treated not as static paperwork but as dynamic control documents that drive technical testing requirements.

### **A. The Data Protection Impact Assessment (DPIA) as a Testing Blueprint (Art. 35\)**

The Data Protection Impact Assessment (DPIA) serves as the foundational risk model for the application, defining the risks associated with high-risk processing and detailing the appropriate Technical and Organisational Measures (TOMs) required for mitigation.1 The DPIA must initiate early in the project lifecycle, running parallel to the planning and development processes, and its outcomes must be systematically integrated back into the project plan.1

The testing protocol must directly target the effectiveness of the solutions identified during the DPIA phase. Verification is mandatory for the four essential elements specified by the GDPR:

1. A detailed description of the processing operations.  
2. An assessment confirming the necessity and proportionality of the processing to the legitimate objective.  
3. A thorough evaluation of the risks to the rights and freedoms of individuals.  
4. The implementation and validation of risk mitigation measures.2

The DPIA establishes the security baseline. For instance, if the DPIA identifies 'encryption of Personal Identifiable Information (PII) at rest' as a necessary mitigation measure, the testing protocol must include rigorous penetration tests specifically designed to verify encryption strength, key management practices, and access controls as required under Article 32 (Security of Processing).5 This linking of legal requirement to technical execution transforms the DPIA into a mandatory requirement matrix for the engineering team. Failure to track and monitor the project against the solutions proposed in the DPIA means continuous compliance maintenance is impossible, leaving the organization exposed to regulatory scrutiny and demonstrating a clear lack of due diligence.6

### **B. Verification of Records of Processing Activities (ROPA) Accuracy (Art. 30\)**

The ROPA is the definitive, authoritative map of all data collection, storage, and transfer activities. GDPR mandates that both controllers and processors maintain these records in an accurate and up-to-date fashion.7 For a testing protocol, the ROPA serves as the compliance baseline against which the application’s runtime behavior is measured.

The ROPA must be granular, self-explanatory, and maintained in an electronic format for ease of update and review.8 Granularity requires detailing specific retention periods for *each* category of data and processing activity documented.9 The technical audit must systematically cross-reference the live application against the required ROPA data points, which include: the purposes of processing, categories of data and data subjects, categories of recipients, details of any international transfers (including the safeguard mechanisms like Standard Contractual Clauses), and defined data retention schedules.8

Regulatory authorities are empowered to request the ROPA for monitoring purposes.7 Consequently, the technical testing protocol must be designed to generate auditable proof that the system accurately reflects the documented ROPA. This involves implementing data discovery and inventory mechanisms 11 that automatically scan the system to compare the data fields actively being collected and used by the app against the ROPA's documented categories. If testing reveals the collection of personal data (e.g., precise geolocation) that is not recorded in the ROPA, this discrepancy signifies an immediate failure of accountability (Art. 5(2)) and exposes the organization to severe penalties.7 An inaccurate ROPA is not merely an administrative error; it is direct evidence of non-compliance, undermining the controller's legal defense.

## **II. Privacy by Design and Default (PbD/PbD) Protocol Verification (Art. 25\)**

Privacy by Design is a core legal mandate requiring controllers to implement appropriate technical and organizational measures at the time the means for processing are determined, ensuring safeguards are integrated into the processing itself.12 Testing protocols must be designed to verify that these principles are technically enforced from the conceptual stage onward.14

### **A. Technical Enforcement of Data Minimization and Storage Limitation**

Data minimization requires that only personal data necessary for each specific purpose of the processing is collected and handled.12 The testing protocol must constrain the application technically to adhere to this principle:

1. **API and Schema Audits:** Tests must be implemented to ensure that application APIs and database schemas are structurally incapable of collecting or accepting data categories beyond the strict minimum required for the stated processing purpose (Limitation of Purpose).16  
2. **Retention Policy Verification:** The protocol must include automated tests that audit the system’s lifecycle management policies, verifying the automatic, irreversible deletion of personal data upon the expiry of the documented retention schedule.8  
3. **"Privacy by Default" Check:** Testing must confirm that, upon installation or first use, all settings default to the highest privacy level, ensuring that personal data is not made accessible to an indefinite number of persons without the explicit intervention of the individual.13

### **B. Segregation and Protection of Environments (Non-Production Testing)**

The development and testing phases require careful segregation to prevent the exposure of real user data.12 The testing protocol must enforce the following isolation checks:

* **Environment Isolation:** Verification of strict technical and organizational separation (e.g., network segmentation, unique access credentials) between production, development, and quality assurance/testing environments.12  
* **Data Usage Audit:** Verification that non-production environments utilize synthetic, fictitious, anonymized, or rigorously pseudonymized data instead of live PII.12  
* **Data Minimization in Testing:** An audit must confirm that if live data must be used for testing, the amount collected or retained in the testing stage is minimized.12

### **C. Pseudonymisation and Anonymization Effectiveness Testing (MIT)**

When pseudonymization or anonymization is employed as a security or privacy enhancing measure (Art. 25, Art. 32), the controller must demonstrate its effectiveness in preventing attribution to data subjects.5

The definitive technical verification standard used by supervisory authorities for assessing re-identification risk is the **Motivated Intruder Test (MIT)**.18 The testing protocol must incorporate rigorous ethical hacking procedures aimed at re-identifying individuals within the supposedly anonymous or pseudonymized dataset.18 The law specifically permits temporary re-identification during security testing to validate the resilience of the technique.19

This sophisticated testing requires technical experts who possess knowledge of the anonymization techniques used and the publicly available external data sources that could be leveraged for matching.18 If the MIT demonstrates a high likelihood of re-identification, the data must be legally treated as PII. This failure immediately requires the implementation of higher organizational and security measures (TOMs) under Article 32 5 and necessitates a formal review of the DPIA’s original risk assessment.4 Consequently, the protocol must mandate periodic MITs, especially after any changes to data processing environments or the integration of new data sets, to ensure the ongoing integrity of the pseudonymization technique.

## **III. Technical Audit Protocol for Consent Management and Dark Patterns**

Invalid consent is one of the most frequently cited compliance failures in enforcement actions.20 The testing protocol must verify both the strict legal criteria for consent and, crucially, the technical integrity of the interface design to prevent deceptive practices.

### **A. Implementation Requirements for Valid Consent (Art. 7\)**

Consent obtained via a mobile application must be specific, informed, unambiguous, and documented via a clear affirmative action.21 The testing protocol must enforce the following:

* **Consent Granularity Verification:** Tests must ensure that consent is requested and recorded for each distinct processing purpose (e.g., analytics, personalized advertising).22 Attempts to obtain "generic" or "bundled" consent are deemed non-compliant.23  
* **Clarity and Distinction:** Verification that consent requests are presented using clear, plain language and are visually separate and distinguishable from other legal texts, such as terms and conditions.22  
* **Transparency Check:** Users must be transparently informed about the specific data being collected and the exact purposes for which it will be used.16

### **B. Testing Against Deceptive Design Patterns (Dark Patterns)**

Regulatory scrutiny, intensified by groups like GPEN, specifically targets manipulative interfaces that undermine genuine consent by biasing user choices.24 Enforcement bodies, such as the Bayerisches Landesamt für Datenschutzaufsicht (BayLDA), have developed automated tools for detecting these failures, necessitating a shift to network-level automation in testing.26

#### **Technical Checks for Interface Integrity:**

1. **Automated Level 0 Consent Verification (BayLDA Focus):** The protocol must include specific tests to verify that the option to 'Agree' and the option to 'Reject' (or deny consent) are equally present and prominent on the *first layer* (Level 0\) of the consent interface.27 Auditing tools must automatically confirm the existence and accessibility of both buttons.27  
2. **Pre-Consent Data Transmission Monitoring:** This is a critical technical compliance check. Premature script loading, where data collection initiates before consent is received, is a common pitfall.28 The testing protocol must utilize network proxies and packet sniffers to monitor all outgoing network traffic immediately upon app launch or script loading, *prior* to any user interaction with the consent banner.27 The passing criterion is the transmission of zero personal data or identifiers (to analytics, advertising, or third-party services) before explicit, affirmative consent is recorded.27

The regulatory trend towards using automated tools for systemic detection of these technical failures means that the testing protocol must integrate these automated checks into the CI/CD environment to prevent deployment of non-compliant code.

### **C. Consent Withdrawal and Logging Verification**

The integrity of consent is maintained only if users can withdraw their consent as simply as they gave it.29 Furthermore, the controller must maintain an immutable record of all consent events.

* **Revocation Workflow Test:** Testing must audit the user flow to ensure that the process for withdrawing consent (e.g., measuring required clicks or steps) is straightforward and equal in complexity to the granting process.23 A dedicated interface, such as a Consent Management Dashboard, facilitates this.23  
* **Auditable Consent Logs:** The system must verify that immutable consent logs are correctly generated, capturing the user ID, the specific purpose consented to, the method of collection, and an accurate timestamp.23 These logs are crucial for auditability and must be easily retrievable for regulatory inspection.

## **IV. Operationalizing and Testing Data Subject Rights (DSRs) API**

The ability to fulfill Data Subject Requests (DSRs)—including the Rights to Access (Art. 15), Erasure (Art. 17), and Portability (Art. 20)—must be supported by tested, secure, and automated API endpoints.30

### **A. DSR Intake and Identity Verification Protocol**

The DSR fulfillment process must begin with a secure and compliant intake and identity verification (IDV) system.11

* **Intake Mechanism Verification:** Tests must validate the availability and functionality of user-friendly intake forms designed to accurately capture and triage DSRs.11  
* **Secure Identity Verification (IDV):** The IDV process must be secure and proportionate. Crucially, testing must confirm that the IDV process does not require the collection of *new* personal data, adhering to the principle of data minimization even during verification.11  
* **Secure Fulfillment Portal:** The test protocol must ensure that the final response containing the individual's personal data is transmitted exclusively via a secure customer portal, preventing the use of inherently insecure channels like plain email.31

### **B. Technical Testing for the Right to Erasure (Art. 17\)**

The Right to Erasure requires comprehensive and permanent deletion without undue delay.32

* **API Specification Check:** Verification requires auditing the existence and functionality of dedicated data deletion endpoints within the application architecture.33 This often involves checking for server-to-server (S2S) calls to processors, such as the gdpr\_forget\_device endpoint used by analytics vendors.34  
* **Comprehensive Deletion Protocol:** Testing must confirm irreversible data removal across all persistent storage layers (database, caches, archives, and backups).35  
* **Third-Party Deletion Verification (Deletion Cascade):** The testing protocol must ensure that initiating a user erasure request automatically triggers the necessary S2S API calls to all external data processors (third-party SDKs, analytics providers) to delete the data on their systems.33 A failure to propagate this request to even one processor due to a faulty API or network error compromises compliance for the controller.36 The protocol must mandate monitoring and logging of S2S deletion confirmation status.  
* **Public Data Erasure Obligation:** For data the controller has made public, testing must verify that technical mechanisms are in place to inform other downstream controllers of the erasure request.32

### **C. Technical Testing for Right to Access and Data Portability (Art. 15, Art. 20\)**

These rights require accurate data retrieval and delivery in a usable format.

* **Data Discovery and Inventory (Art. 15):** Testing must validate the accuracy of the data inventory system to ensure that *all* personal data associated with the subject—including provided data, observed data (e.g., location, traffic), and inferred or derived personal data (e.g., user profiles)—is located and prepared for retrieval.11  
* **Portability Scope Verification (Art. 20):** While the Right to Access covers all personal data, the Right to Portability is restricted to data provided by or observed about the data subject.37 The test must verify that the portability output excludes complex inferred or derived data generated by the controller (e.g., advanced business intelligence profiles), while including raw data processed by connected devices.37  
* **Format Verification:** The test must confirm that the portable data is delivered in a structured, commonly used, and machine-readable format (e.g., JSON).38  
* **Direct Transfer Feasibility:** Testing must validate the technical capability to transmit the portable data directly from the current controller to a new controller upon the data subject's request, where such transfer is technically feasible.38

## **V. Third-Party Risk Management and Data Transfer Validation**

The controller is legally responsible for ensuring that any data processor it uses provides sufficient guarantees regarding compliance and security (Art. 28).36 Third-party relationships, including cloud services and integrated SDKs, represent a significant source of security and compliance failures.20

### **A. Technical Audit of Data Processors (Vendors/SDKs)**

The compliance testing protocol must incorporate systematic due diligence and technical monitoring of processor activities.40

* **Purpose Limitation Verification:** The protocol must mandate run-time traffic analysis (network inspection) to test live data flows to third parties. This confirms that the data transmitted is strictly limited to the necessary categories and purposes documented in the ROPA and the contractual Data Processing Agreement.20  
* **Technical and Organizational Measures (TOMs) Audit:** The testing must verify that the processor's documented TOMs are effective. This includes auditing their access control policies, such as strong password requirements (e.g., at least eight characters, required resets), automatic log-off, and the physical security measures for processing facilities.42  
* **Due Diligence and Re-audits:** Establish protocols for initial due diligence using security assessment questionnaires and mandatory scheduled re-audits of third-party vendors to ensure continuous adherence to privacy standards.40

Since technical misconfigurations by vendors are a common source of enforcement action, the controller must recognize its joint liability.36 The testing protocol's integration of live traffic monitoring is essential to provide continuous technical validation that vendors are adhering to data minimization and purpose limitations in real-time, moving accountability beyond mere contractual language.

### **B. Standard Contractual Clauses (SCCs) Verification and International Transfers**

Data transfers outside the European Economic Area (EEA) require appropriate safeguards, most often provided by the new European Commission-approved SCCs.43

* **SCC Implementation Check:** The protocol must verify that all international data transfers utilize the correct EC-approved SCC modules relevant to the transfer scenario (e.g., Controller-to-Processor).45  
* **Annexes Audit:** The Annexes to the SCCs detail the specific technical security measures (TOMs) and the purposes of the transfer.45 Testing must confirm that the implemented technical security measures within the application (e.g., encryption applied to data during transit to a foreign server) accurately match the descriptions outlined in these Annexes.  
* **Transfer Mechanism Documentation:** The ROPA must meticulously record all transfers to third countries, including documentation of the specific transfer mechanism safeguards in place.8 Testing verifies the mechanism used (e.g., SCCs) is valid and correctly applied at the technical layer.

## **VI. Continuous Security, Monitoring, and Accountability**

Compliance requires continuous effort. The organizational structure and the implemented technical measures (TOMs) must be regularly tested and evaluated to ensure they remain effective and state-of-the-art.5

### **A. Auditing Technical and Organisational Measures (TOMs)**

Article 32 mandates a formal process for regularly testing, assessing, and evaluating the effectiveness of TOMs.5

* **Mandatory Security Testing:** Implement a cycle of regular penetration testing and vulnerability assessments to verify the ongoing confidentiality, integrity, availability, and resilience of processing systems.5  
* **Access Control and Authentication Checks:** Testing must verify strict adherence to documented authorization concepts 46, including robust access control policies and the specific TOMs implemented for job control, such as strong password requirements, automatic log-off of inactive user IDs, and automatic deactivation of credentials for personnel no longer authorized to access personal data.42  
* **Confidentiality and Integrity Verification:** Rigorous testing is necessary to confirm the consistent and correct implementation of encryption and pseudonymization for data at rest and in transit.5

Due to the common pitfall of compliance decay when regular audits are neglected 20, the testing protocol must mandate an annual, documented, and independent audit of the entire compliance infrastructure. This systematic review ensures that technical measures remain appropriate to the risks and generates essential evidence of ongoing accountability (Art. 5(2)).5

### **B. Protocol for Data Breach Response Plan Verification**

While preventative security is paramount, the ability to respond effectively to an incident is crucial for accountability and mitigating the severity of potential fines.20

* **Simulated Breach Test:** Conduct periodic, documented simulations of data breaches to test the efficacy and timeliness of the organizational incident response plan, including the operational ability to detect, contain, and remediate the breach.20  
* **Response Time Audit:** Verification must ensure the organizational capability to notify supervisory authorities and affected data subjects within the required legal timelines, demonstrating that delays in breach handling—a confirmed compliance pitfall—are avoided.20

### **C. HIPAA Integration Points (For Health and Medical Apps)**

For applications processing Protected Health Information (PHI) of users subject to US jurisdiction, compliance with HIPAA must be verified alongside GDPR.47

* **Scope Distinction:** The testing protocol must account for the difference in scope: GDPR covers all personal data for EU residents, whereas HIPAA covers only PHI.47  
* **Technical Overlaps for Verification:** Consolidation of testing efforts should focus on shared technical mandates: both regimes require controlled access to sensitive data and the implementation of encryption for sensitive data (PHI/PII) both at rest and in transit.5 Furthermore, both grant individuals specific data rights (access, amendment, and deletion), confirming that the DSR API testing defined in Section IV serves a dual-compliance purpose.47

### **D. Finalizing the Testing Protocol Documentation**

The completion of the testing protocol requires systematic and granular documentation that serves as the final proof of compliance.9

* **Documentation Granularity:** All test results, failed tests, mitigation actions taken, and final sign-offs must be recorded.6 The documentation must be sufficiently granular to prove that the DPIA outcomes were integrated, risks were reviewed, and the effectiveness of all implemented TOMs was evaluated.9  
* **Self-Explanatory Records:** Audit logs and technical test reports must clearly articulate how technical choices enforce legal compliance, ensuring that records are self-explanatory to supervisory authorities without requiring supplementary explanation.9 This guarantees that accountability is provable through the technical record.

#### **Sources des citations**

1. Data Protection Impact Assessments, consulté le octobre 12, 2025, [http://www.dataprotection.ie/en/organisations/know-your-obligations/data-protection-impact-assessments](http://www.dataprotection.ie/en/organisations/know-your-obligations/data-protection-impact-assessments)  
2. Data protection impact assessments | ICO \- Information Commissioner's Office, consulté le octobre 12, 2025, [https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-impact-assessments/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-impact-assessments/)  
3. How do we do a DPIA? | ICO \- Information Commissioner's Office, consulté le octobre 12, 2025, [https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/how-do-we-do-a-dpia/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/how-do-we-do-a-dpia/)  
4. A Practical Guide to DPIAs: Managing Risk, AI Ethics, and Global Privacy Regulations, consulté le octobre 12, 2025, [https://trustarc.com/resource/guide-to-dpias-managing-risk-ai/](https://trustarc.com/resource/guide-to-dpias-managing-risk-ai/)  
5. Art. 32 GDPR – Security of processing \- General Data Protection Regulation (GDPR), consulté le octobre 12, 2025, [https://gdpr-info.eu/art-32-gdpr/](https://gdpr-info.eu/art-32-gdpr/)  
6. What Is a DPIA (Data Protection Impact Assessment)? \- Osano, consulté le octobre 12, 2025, [https://www.osano.com/articles/dpia-data-protection-impact-assessments](https://www.osano.com/articles/dpia-data-protection-impact-assessments)  
7. Records of Processing Activities \- General Data Protection Regulation (GDPR), consulté le octobre 12, 2025, [https://gdpr-info.eu/issues/records-of-processing-activities/](https://gdpr-info.eu/issues/records-of-processing-activities/)  
8. Records of processing and lawful basis | ICO, consulté le octobre 12, 2025, [https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/accountability-framework/records-of-processing-and-lawful-basis/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/accountability-framework/records-of-processing-and-lawful-basis/)  
9. Records of Processing Activities (RoPA) under Article 30 GDPR \- Data Protection Commission, consulté le octobre 12, 2025, [https://www.dataprotection.ie/sites/default/files/uploads/2023-04/Records%20of%20Processing%20Activities%20%28RoPA%29%20under%20Article%2030%20GDPR.pdf](https://www.dataprotection.ie/sites/default/files/uploads/2023-04/Records%20of%20Processing%20Activities%20%28RoPA%29%20under%20Article%2030%20GDPR.pdf)  
10. GDPR compliance checklist \- GDPR.eu, consulté le octobre 12, 2025, [https://gdpr.eu/checklist/](https://gdpr.eu/checklist/)  
11. Common Challenges and Mistakes when fulfilling DSRs (Data Subject Requests), consulté le octobre 12, 2025, [https://www.lightbeam.ai/resources/blogs/common-challenges-and-mistakes-when-fulfilling-dsrs-data-subject-requests/](https://www.lightbeam.ai/resources/blogs/common-challenges-and-mistakes-when-fulfilling-dsrs-data-subject-requests/)  
12. Privacy by design and by default. A guide for developers \- Autoritat Catalana de Protecció de Dades, consulté le octobre 12, 2025, [https://apdcat.gencat.cat/web/.content/03-documentacio/documents/guiaDesenvolupadors/GUIA-PDDD\_EN.pdf](https://apdcat.gencat.cat/web/.content/03-documentacio/documents/guiaDesenvolupadors/GUIA-PDDD_EN.pdf)  
13. GDPR General Data Protection Regulation Compliance Checklist \- Appknox, consulté le octobre 12, 2025, [https://www.appknox.com/blog/gdpr-compliance-checklist](https://www.appknox.com/blog/gdpr-compliance-checklist)  
14. Privacy by Design 101: Enhancing Trust & Compliance | Usercentrics, consulté le octobre 12, 2025, [https://usercentrics.com/knowledge-hub/what-is-privacy-by-design/](https://usercentrics.com/knowledge-hub/what-is-privacy-by-design/)  
15. Secure personal data | European Data Protection Board, consulté le octobre 12, 2025, [https://www.edpb.europa.eu/sme-data-protection-guide/secure-personal-data\_en](https://www.edpb.europa.eu/sme-data-protection-guide/secure-personal-data_en)  
16. How to Build a GDPR-Compliant Mobile App \- Step-by-Step Guide \- UXCam, consulté le octobre 12, 2025, [https://uxcam.com/blog/gdpr-compliant-mobile-app/](https://uxcam.com/blog/gdpr-compliant-mobile-app/)  
17. Guidelines 01/2025 on Pseudonymisation \- European Data Protection Board, consulté le octobre 12, 2025, [https://www.edpb.europa.eu/system/files/2025-01/edpb\_guidelines\_202501\_pseudonymisation\_en.pdf](https://www.edpb.europa.eu/system/files/2025-01/edpb_guidelines_202501_pseudonymisation_en.pdf)  
18. How do we ensure anonymisation is effective? | ICO, consulté le octobre 12, 2025, [https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/)  
19. Pseudonymisation | ICO, consulté le octobre 12, 2025, [https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/pseudonymisation/)  
20. Best Practices for GDPR Compliance Testing \- Alphabin, consulté le octobre 12, 2025, [https://www.alphabin.co/blog/gdpr-compliance-testing-best-practices](https://www.alphabin.co/blog/gdpr-compliance-testing-best-practices)  
21. GDPR and Mobile Apps \- TermsFeed, consulté le octobre 12, 2025, [https://www.termsfeed.com/blog/gdpr-mobile-apps/](https://www.termsfeed.com/blog/gdpr-mobile-apps/)  
22. What Is GDPR Compliance? \- Palo Alto Networks, consulté le octobre 12, 2025, [https://www.paloaltonetworks.com/cyberpedia/gdpr-compliance](https://www.paloaltonetworks.com/cyberpedia/gdpr-compliance)  
23. GDPR Software Requirements: A Complete Guide \- CookieYes, consulté le octobre 12, 2025, [https://www.cookieyes.com/blog/gdpr-software-requirements/](https://www.cookieyes.com/blog/gdpr-software-requirements/)  
24. 2024 GPEN Sweep on deceptive design patterns | Global Privacy Enforcement Network, consulté le octobre 12, 2025, [https://www.privacyenforcement.net/content/2024-gpen-sweep-deceptive-design-patterns](https://www.privacyenforcement.net/content/2024-gpen-sweep-deceptive-design-patterns)  
25. How Dark Patterns Impact GDPR Compliance \- Blog \- Dec 03, 2024, consulté le octobre 12, 2025, [https://www.fairpatterns.com/post/how-dark-patterns-impact-gdpr-compliance](https://www.fairpatterns.com/post/how-dark-patterns-impact-gdpr-compliance)  
26. Landesdatenschutzbehörde führt Kontrolle von Websites und Apps durch – IT-Recht-Kanzlei \- DURY LEGAL Rechtsanwälte, consulté le octobre 12, 2025, [https://www.dury.de/datenschutzrecht/943-landesdatenschutzbehoerde-fuehrt-kontrolle-von-webseiten-und-apps-durch](https://www.dury.de/datenschutzrecht/943-landesdatenschutzbehoerde-fuehrt-kontrolle-von-webseiten-und-apps-durch)  
27. Datenschutz und Informationspflichten für APPs, consulté le octobre 12, 2025, [https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Datenschutz/DSGVO\_TTDSG\_Data-Act\_Michael-Will.pdf](https://www.ihk-muenchen.de/ihk/documents/Recht-Steuern/Datenschutz/DSGVO_TTDSG_Data-Act_Michael-Will.pdf)  
28. Common GDPR Compliance Issues \- Wix Developers, consulté le octobre 12, 2025, [https://dev.wix.com/docs/build-apps/launch-your-app/legal-and-security/gdpr-compliance/common-gdpr-compliance-issues](https://dev.wix.com/docs/build-apps/launch-your-app/legal-and-security/gdpr-compliance/common-gdpr-compliance-issues)  
29. Mobile applications: CNIL publishes its recommendations for better privacy protection, consulté le octobre 12, 2025, [https://www.cnil.fr/en/mobile-applications-cnil-publishes-its-recommendations-better-privacy-protection](https://www.cnil.fr/en/mobile-applications-cnil-publishes-its-recommendations-better-privacy-protection)  
30. Your complete guide to General Data Protection Regulation (GDPR ..., consulté le octobre 12, 2025, [https://www.onetrust.com/blog/gdpr-compliance/](https://www.onetrust.com/blog/gdpr-compliance/)  
31. Data Subject Request DSR Automation | Products \- OneTrust, consulté le octobre 12, 2025, [https://www.onetrust.com/products/data-subject-request-dsr-automation/](https://www.onetrust.com/products/data-subject-request-dsr-automation/)  
32. Art. 17 GDPR – Right to erasure ('right to be forgotten') \- General Data Protection Regulation (GDPR), consulté le octobre 12, 2025, [https://gdpr-info.eu/art-17-gdpr/](https://gdpr-info.eu/art-17-gdpr/)  
33. API Data Protection: Complete Developer's GDPR Implementation Guide \- ComplyDog, consulté le octobre 12, 2025, [https://complydog.com/blog/api-data-protection-developers-gdpr-implementation-guide](https://complydog.com/blog/api-data-protection-developers-gdpr-implementation-guide)  
34. Data erasure API \- Adjust Developer Hub, consulté le octobre 12, 2025, [https://dev.adjust.com/en/api/s2s-api/data-erasure-api/](https://dev.adjust.com/en/api/s2s-api/data-erasure-api/)  
35. How to Prove You Honored the Right to Be Forgotten \- iubenda help, consulté le octobre 12, 2025, [https://www.iubenda.com/en/help/7399-right-to-be-forgotten](https://www.iubenda.com/en/help/7399-right-to-be-forgotten)  
36. Third-Party Risk Management for GDPR Compliance \- ComplyDog, consulté le octobre 12, 2025, [https://complydog.com/blog/third-party-risk-management-gdpr-compliance](https://complydog.com/blog/third-party-risk-management-gdpr-compliance)  
37. Right to data portability | ICO \- Information Commissioner's Office, consulté le octobre 12, 2025, [https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/individual-rights/right-to-data-portability/)  
38. Art. 20 GDPR – Right to data portability \- General Data Protection Regulation (GDPR), consulté le octobre 12, 2025, [https://gdpr-info.eu/art-20-gdpr/](https://gdpr-info.eu/art-20-gdpr/)  
39. Ensuring Third-Party Data Sharing Compliance: Key Regulations and Best Practices, consulté le octobre 12, 2025, [https://mitratech.com/resource-hub/blog/third-party-data-sharing-compliance/](https://mitratech.com/resource-hub/blog/third-party-data-sharing-compliance/)  
40. General Data Protection Regulation (GDPR) Compliance | Solutions \- OneTrust, consulté le octobre 12, 2025, [https://www.onetrust.com/solutions/gdpr-compliance/](https://www.onetrust.com/solutions/gdpr-compliance/)  
41. GDPR-Relevant Privacy Concerns in Mobile Apps Research: A Systematic Literature Review \- arXiv, consulté le octobre 12, 2025, [https://arxiv.org/html/2411.19142v1](https://arxiv.org/html/2411.19142v1)  
42. THERMO FISHER SCIENTIFIC TECHNICAL AND ORGANIZATIONAL MEASURES (TOMS) This Annex describes the TOMs that the Processor shall, as, consulté le octobre 12, 2025, [https://corporate.thermofisher.com/content/dam/tfcorpsite/documents/procurement/prior-versions/Technical%20and%20Organization%20Measures%20(TOMs)%20Valid%20to%2005012022.pdf](https://corporate.thermofisher.com/content/dam/tfcorpsite/documents/procurement/prior-versions/Technical%20and%20Organization%20Measures%20\(TOMs\)%20Valid%20to%2005012022.pdf)  
43. EU Standard Contractual Clauses \- Google Cloud, consulté le octobre 12, 2025, [https://cloud.google.com/security/compliance/eu-scc](https://cloud.google.com/security/compliance/eu-scc)  
44. Firebase: Standard Contractual Clauses (Module 2: Controller-to-Processor) \- Google, consulté le octobre 12, 2025, [https://firebase.google.com/terms/firebase-sccs-eu-c2p](https://firebase.google.com/terms/firebase-sccs-eu-c2p)  
45. New Standard Contractual Clauses \- Questions and Answers overview, consulté le octobre 12, 2025, [https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview\_en](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en)  
46. German DPA released audit checklist for GDPR readiness | Technology Law Dispatch, consulté le octobre 12, 2025, [https://www.technologylawdispatch.com/2019/08/privacy-data-protection/german-dpa-released-audit-checklist-for-gdpr-readiness/](https://www.technologylawdispatch.com/2019/08/privacy-data-protection/german-dpa-released-audit-checklist-for-gdpr-readiness/)  
47. GDPR vs HIPAA Compliance: What are the Differences? \- Securiti, consulté le octobre 12, 2025, [https://securiti.ai/gdpr-vs-hipaa/](https://securiti.ai/gdpr-vs-hipaa/)  
48. HIPAA vs. GDPR Compliance: What's the Difference? | Blog \- OneTrust, consulté le octobre 12, 2025, [https://www.onetrust.com/blog/hipaa-vs-gdpr-compliance/](https://www.onetrust.com/blog/hipaa-vs-gdpr-compliance/)