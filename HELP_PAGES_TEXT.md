# Help Pages - All Text Content

This document contains all the text from the Help Center pages for easy editing.

---

## Main Help Center Page (`/help`)

### Hero Section
- **Title:** How can we help you? 🦍
- **Subtitle:** Find answers, guides, and tips to get the most out of Taskorilla
- **Search Placeholder:** Search for help articles, guides, and FAQs...

### Quick Links Section
- **Button 1:** 📋 Browse All FAQs
- **Button 2:** 📚 View All Guides
- **Button 3:** Contact Support (with icon)

### Categories Section
- **Heading:** Browse by Category

### Popular Questions Section
- **Heading:** Popular Questions
- **Question 1:** How do I create a Taskorilla account?
  - **Description:** Get started in just a few clicks
- **Question 2:** How do I post a task?
  - **Description:** Learn how to create your first task
- **Question 3:** How does payment work?
  - **Description:** Understand our secure payment system
- **Question 4:** How do I become a Tasker?
  - **Description:** Start earning money helping others

### Contact Support CTA Section
- **Heading:** Still need help?
- **Text:** Can't find what you're looking for? Our support team is here to help!
- **Button:** Contact Support
- **Footer Text:** We typically respond within 24 hours

---

## FAQ Page (`/help/faq`)

### Header Section
- **Back Link:** Back to Help Center
- **Title:** Frequently Asked Questions
- **Subtitle:** Quick answers to common questions about Taskorilla
- **Search Placeholder:** Search FAQs...

### Still Need Help Section
- **Heading:** Didn't find your answer?
- **Text:** Check out our detailed guides or contact our support team
- **Button 1:** View All Guides
- **Button 2:** Contact Support

---

## Guides Page (`/help/guides`)

### Header Section
- **Back Link:** Back to Help Center
- **Title:** Taskorilla Guides
- **Subtitle:** Step-by-step guides to help you get the most out of Taskorilla
- **Search Placeholder:** Search guides...

---

## Category Page (`/help/category/[slug]`)

### Header Section
- **Back Link:** Back to Help Center
- **Category Title:** (Dynamic - shows category name)
- **Category Description:** (Dynamic - shows category description)

### Content Section
- **Guides Heading:** Guides
- **FAQs Heading:** Frequently Asked Questions

### Empty State
- **Text:** No content available for this category yet.
- **Link:** ← Back to Help Center

---

## Individual Guide Page (`/help/guides/[slug]`)

### Header Section
- **Back Link:** Back to Guides
- **Category Badge:** (Dynamic - shows category)
- **Read Time:** 📖 5 min read
- **Title:** (Dynamic - shows guide title)

### Content Section
- **Content:** (Dynamic - shows guide content formatted)

### Feedback Section
- **Heading:** Was this guide helpful?
- **Feedback Buttons:** (Yes/No buttons)

### Related FAQs Section
- **Heading:** Related FAQs
- **Link:** View all FAQs →

### Still Need Help Section
- **Heading:** Still have questions?
- **Text:** Our support team is here to help you succeed
- **Button:** Contact Support

---

## Search Page (`/help/search`)

### Header Section
- **Back Link:** Back to Help Center
- **Title:** Search Results
- **Results Text:** (Dynamic - shows number of results) found for "(query)"

### No Results Section
- **Heading:** No results found
- **Text:** Try different keywords or browse our categories
- **Button:** Back to Help Center

---

## Category Descriptions (from `lib/help-utils.ts`)

1. **Getting Started:** New to Taskorilla? Start here to learn the basics.
2. **Posting Tasks:** Learn how to post, edit, and manage your tasks.
3. **Tasker Guide:** Everything you need to know about earning as a Tasker.
4. **Payment Guide:** Understand payments, fees, and how to get paid.
5. **Safety Guide:** Stay safe and protect yourself on the platform.
6. **Platform & Technical:** Technical help, account issues, and troubleshooting.
7. **Legal & Privacy:** Policies, data protection, and compliance information.

---

## All FAQs (from `lib/help-content.json`)

### Getting Started Category

**FAQ 1: How do I create a Taskorilla account?**
- **Content:** Click 'Sign Up,' enter your email, pick a password, and confirm. You're ready to post or do tasks.

**FAQ 2: Do I need a verified ID to start?**
- **Content:** Not immediately, but verifying your ID helps build trust with other users and unlocks higher-value tasks.

**FAQ 3: Can I use Taskorilla on mobile?**
- **Content:** Absolutely. Our site works on any mobile browser, and we're working on an app soon.

**FAQ 4: How do I edit my profile?**
- **Content:** Go to 'My Profile,' update your info, skills, or profile picture, and hit save.

### Posting Tasks Category

**FAQ 1: How do I post a task?**
- **Content:** Click 'Post a Task,' describe what you need, set location, time, and budget. Then hit 'Post.'

**FAQ 2: Can I edit a task after posting?**
- **Content:** Yes, you can edit the description, budget, or deadline before anyone accepts it.

**FAQ 3: Can I cancel a task?**
- **Content:** You can, but we recommend messaging any assigned Tasker first. Cancellation fees may apply for confirmed tasks.

**FAQ 4: How do I find Taskers for my task?**
- **Content:** Once posted, Taskers in your area get a notification. You can also browse profiles and invite them directly.

### Tasker Guide Category

**FAQ 1: How do I become a Tasker?**
- **Content:** Sign up, complete your profile, verify your ID, and you're ready to browse tasks.

**FAQ 2: Can I accept multiple tasks at once?**
- **Content:** Yes, but only take what you can realistically complete on time.

**FAQ 3: How do I mark a task as completed?**
- **Content:** Open the task in your dashboard and click 'Mark as Completed.' The poster will then confirm.

**FAQ 4: What if I can't finish a task?**
- **Content:** Communicate with the poster immediately. Unfinished tasks can affect your rating.

**FAQ 5: How should I price my bid?**
- **Content:** Always enter your full price in euros (including time, materials, transport, and fees) and use the Price Justification box to explain what the poster gets for that amount. Once a poster accepts your bid the price is locked in, so only commit to a number you are happy to honour.

### Payment Guide Category

**FAQ 1: How does payment work?**
- **Content:** Posters pay through our secure system. Taskers get paid after the task is confirmed as complete.

**FAQ 2: Are there fees?**
- **Content:** Yes, Taskorilla takes a small service fee from the tasker, as of December 2025 that is €2 and 10% from the Helper/Professional.

**FAQ 3: How do I get paid?**
- **Content:** Add your bank or payment account in settings. Once a task is confirmed, we transfer funds automatically.

### Safety Guide Category

**FAQ 1: How do I stay safe when meeting Taskers or Posters?**
- **Content:** Meet in public spaces when possible, verify profiles, and never share unnecessary personal info.

**FAQ 2: What if I have a problem with a Tasker or Poster?**
- **Content:** Report the issue through the platform. We take safety seriously and will help resolve it.

**FAQ 3: Can I block a user?**
- **Content:** Yes. Go to their profile and click 'Block User.' They won't see or message you.

**FAQ 4: What if something gets damaged during a task?**
- **Content:** Always document it with photos and contact the other party.

### Platform & Technical Category

**FAQ 1: Can I delete my Taskorilla account?**
- **Content:** Yes, but note that completed task history may remain for record-keeping.

**FAQ 2: Why can't I post a task or accept one?**
- **Content:** Check if your account is verified and that you haven't been suspended for any reason.

**FAQ 3: How do I reset my password?**
- **Content:** Click 'Forgot Password,' enter your email, and follow the link we send.

**FAQ 4: Why am I not seeing certain tasks?**
- **Content:** Tasks are shown based on location, skills, and availability. Update your profile for better matches.

**FAQ 5: How do I contact support?**
- **Content:** Use the 'Contact Support' form in the Help Center. We usually reply within 24 hours.

---

## All Guides (from `lib/help-content.json`)

### Getting Started Category

**Guide: Getting Started with Taskorilla**

**Step 1: Sign Up**
Click 'Sign Up,' enter your email, create a password, and confirm. You'll receive a confirmation email — click the link to verify your account.

**Step 2: Verify Your Account (Optional but Recommended)**
Verifying your ID helps build trust with other users and unlocks higher-value tasks. Go to 'My Profile' and upload a photo ID.

**Step 3: Set Up Your Profile**
Add a profile picture, list your skills (if you plan to be a Tasker), and write a short bio. A complete profile makes you more trustworthy and helps you get matched with the right tasks.

**Step 4: Browse Tasks or Post a Task**
Decide whether you want to post a task (if you need help) or browse tasks (if you want to earn money as a Tasker). Click 'Post a Task' or 'Browse Tasks' from the main menu.

**Step 5: Check Notifications**
Keep track of messages, bids, and task updates through your dashboard and email notifications. Stay responsive to build a good reputation!

---

### Posting Tasks Category

**Guide: How to Post a Task**

**Step 1: Click 'Post a Task'**
From the main menu or homepage, click 'Post a Task.' Enter a clear, descriptive title (e.g., 'Assemble IKEA Furniture') and provide detailed instructions about what needs to be done.

**Step 2: Set Location and Timing**
Specify where the task needs to happen (address or postcode) and when you need it done. You can set a specific date/time or mark it as flexible.

**Step 3: Set Your Budget**
Enter the amount you're willing to pay. Taskorilla will show you the service fee upfront. Be fair — competitive budgets attract better Taskers!

**Step 4: Add Photos (Optional)**
Upload photos to give Taskers a better idea of what's involved. This helps them provide accurate bids.

**Step 5: Publish Your Task**
Click 'Post.' Your task goes live immediately, and nearby Taskers get notified. You'll receive bids and can chat with interested Taskers to finalize details.

**Step 6: Manage Your Tasks**
From your dashboard, you can edit task details, cancel if needed, or message Taskers. Once the task is complete, confirm completion and leave a review.

---

### Tasker Guide Category

**Guide: Working as a Tasker**

**Step 1: Complete Your Tasker Profile**
After signing up, complete your Tasker profile. Add your skills, experience, availability, hourly rate, and any tools/equipment you have. Upload a profile picture — it builds trust!

**Step 2: Browse Available Tasks**
Go to 'Browse Tasks' to see tasks near you that match your skills. Use filters to narrow down by category, distance, or budget.

**Step 3: Submit a Bid**
Found a task you can do? Click 'Submit Bid,' explain why you're a good fit, and confirm your availability. Be clear and professional.

**Step 4: Communicate with the Poster**
If your bid is accepted, you'll get a notification. Message the poster to confirm details, timing, and any special requirements.

**Step 5: Complete the Task**
Show up on time, do the job well, and follow the poster's instructions. Take photos of your work if needed — it helps with disputes and builds your reputation.

**Step 6: Mark as Completed**
Once finished, click 'Mark as Completed' in your dashboard. The poster will confirm, and you'll get paid automatically.

**Step 7: Build Your Reputation**
Ask for reviews after every task. A high rating and positive feedback mean more jobs and better pay!

---

### Payment Guide Category

**Guide: Understanding Payments on Taskorilla**

**Step 1: Add Your Payout Method**
Head to Profile > Add your PayPal email. This lets you receive payments easily as a Helper or Professional. Don't have a PayPal account yet? Create one [here](https://www.paypal.com/signup) and get set up in minutes.

**Step 2: Understand Fees**
Taskorilla takes a small service fee from each transaction. As of December 2025, fees are €2 per task from the tasker and 10% fee from the Helper/Professional.

**Step 3: Make or Receive Payment**

**For Posters:** When you accept a bid, you'll be prompted to pay securely through our platform. Funds are held until the task is confirmed as complete.

**For Taskers:** Once a task is marked complete and confirmed by the poster, payment is released to your account automatically.

**Step 4: Track Your Payments and Payouts**
Check your dashboard for payment history, pending payments or payouts, and completed transactions. You'll receive email confirmations for every payment or payout.

**Step 5: Payouts (for Helpers and Professionals)**
Payments are transferred to your linked account automatically after task confirmation.

**Guide: Disputes and Refunds**

**Last Updated: November 17, 2025**

Taskorilla is not a party to agreements between Posters and Taskers. Any disputes must be handled directly between those two users.

Taskorilla does not provide refunds for task payments unless there is a confirmed platform error, such as a duplicated charge caused by the platform itself.

We do not mediate disagreements, guarantee outcomes, or compensate users for incomplete tasks, dissatisfaction, or disagreements between Posters and Taskers.

---

### Safety Guide Category

**Guide: Staying Safe on Taskorilla**

**Step 1: Verify Profiles Before Working Together**
Always check a user's profile, reviews, and verification status before accepting or assigning a task. Verified users with good reviews are more trustworthy.

**Step 2: Meet in Public Spaces When Possible**
For tasks that don't require being at someone's home (like delivery or moving), arrange to meet in a public location first.

**Step 3: Communicate Clearly Through the Platform**
Use Taskorilla's messaging system for all communication. This keeps a record and helps resolve disputes. Never share personal contact info like phone numbers or emails early on.

**Step 4: Protect Your Personal Information**
Don't overshare. Your profile should include enough to build trust, but not sensitive details like your full address, bank info, or personal identification numbers.

**Step 5: Document Everything**
Take photos before and after completing a task. This protects both parties in case of damage claims or disputes about work quality.

**Step 6: Trust Your Instincts**
If something feels off, it probably is. Don't proceed with a task if you're uncomfortable. You can always cancel and report suspicious behavior.

**Step 7: Report Problems Immediately**
If someone is harassing you, acting suspiciously, or breaking platform rules, use the 'Report' button on their profile. We take safety seriously and will investigate promptly.

**Step 8: Review Safety Tips Regularly**
Check our Help Center for updated safety guidelines. Stay informed about common scams and how to avoid them.

**Guide: Marketplace Safety Guidelines**

**Last Updated: November 17, 2025**

Taskorilla does not verify every user, supervise tasks, or guarantee that every experience will be safe. Always use caution.

**Safety Tips**

- Meet in public places whenever possible.
- Avoid tasks that feel risky or unsafe.
- Trust your instincts — walk away if something feels off.
- Hold off on sharing personal contact details until you feel comfortable.
- Report suspicious behaviour immediately within the platform.

**Platform Restrictions**

Taskorilla does not allow illegal tasks, dangerous activities, offensive behaviour, or attempts to move conversations off the platform to avoid our rules.

**Emergency Situations**

If you ever feel unsafe, contact local authorities right away. Taskorilla is not an emergency service.

---

### Legal & Privacy Category

**Guide: GDPR Data Processing Add-On**

**Last Updated: November 17, 2025**

This add-on applies to users in the European Economic Area (EEA) and the United Kingdom.

**Data Controller**

Taskorilla is the data controller for the information you provide through the platform.

**Your Rights Under GDPR**

You may request access, correction, deletion, restriction of processing, data portability, or withdrawal of consent. Contact us to exercise these rights.

**Data Transfers**

We may transfer data outside the EEA or UK using legally recognised safeguards such as Standard Contractual Clauses.

**Obligations**

Do not upload information about others unless you have their permission.

---

## Contact Information

All help pages reference: **tee@taskorilla.com** for support contact.

---

## Notes

- All em dashes (—) should be replaced with commas (,) per previous request
- Category icons are defined in `lib/help-utils.ts` and use emojis
- The help content is stored in `lib/help-content.json` as JSON
- Page structure and navigation text is in the respective page files in `app/help/`



