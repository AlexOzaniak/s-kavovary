# GDPR Compliance Checklist

## Implemented
- Cookie consent banner shown on first visit.
- Consent manager with `Accept all`, `Reject all`, and `Customize` options.
- No optional categories are pre-selected.
- Consent choice is stored and can be reopened later from the footer or banner.
- Functional content is gated until consent, including the embedded Google Maps iframe.
- Booking form includes a required privacy acknowledgement checkbox.
- Booking submission is blocked if the privacy acknowledgement is missing.
- Privacy policy page created at `frontend/privacy.html`.
- Cookie categories documented for necessary, functional, analytics, and marketing use cases.
- Third-party font loading removed from the public site to reduce unnecessary data transfers.

## Remaining placeholders to fill manually
- Legal entity name / controller name.
- Company registration numbers: IČO, DIČ, IČ DPH if applicable.
- GDPR contact details.
- Hosting provider name.
- SMTP / e-mail provider name.
- Final retention periods.

## Manual owner actions
- Fill in the placeholders in `frontend/privacy.html`.
- Check that the stated lawful basis matches how bookings are actually handled.
- Review whether Google Maps should stay enabled.
- Update the policy before adding analytics or marketing tools.
- Verify the cookie categories against the real services in use.

## Possible legal risks
- Google Maps may transfer IP address and device data to Google when functional cookies are enabled.
- If any hosting provider stores access logs, those logs may constitute personal data and need to be covered by the policy.
- If marketing or analytics tools are added later without updating consent handling, the site may become non-compliant.
- If the controller details or retention periods are left as placeholders in production, the policy will be incomplete.
- If the final lawful basis for the booking form is not aligned with the wording in the policy, the privacy notice may be misleading.

## Verification notes
- The site currently has no analytics script in the codebase.
- The only third-party interactive integration detected is Google Maps.
- The booking endpoint collects: name, e-mail, phone, selected service, preferred date, message, and privacy acknowledgement.
