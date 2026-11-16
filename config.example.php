<?php
/*
 * Copy to config.php next to api.php. Every key is optional.
 * Environment variables SCOPEDUE_<KEY> (mail, portal_url, viewer_url, mail_from, google_client_id, google_jwks, stripe_secret, stripe_webhook_secret, stripe_price, stripe_api, billing_url) and SCOPEDUE_DB_<HOST|PORT|NAME|USER|PASS> win over this file.
 */
return [
    'portal_url' => 'https://example.com/portal.html',
    'viewer_url' => 'https://portal.scopedue.com/',   // v70: the Viewer portal (CONTRACT 32.6)
    'mail_from'  => 'ScopeDue <no-reply@example.com>',
    // 1.21.0: every email also goes as a letter (HTML). "Open ScopeDue" in mail to an account holder goes to app_url; ScopeDue's
    // mark at the head of its letters is mail_logo ('' = the name alone). These are the defaults:
    // 'app_url'   => 'https://app.scopedue.com/',
    // 'mail_logo' => 'https://scopedue.com/assets/apple-touch-icon.png',
    // Required: the website's MySQL / MariaDB database. Accounts are its `users` rows; api.php adds its own api_* tables.
    'db' => ['host' => 'localhost', 'port' => 3306, 'name' => 'site_db', 'user' => 'site_user', 'pass' => ''],

    // Sign in with Google. Leave empty to keep it off (the email code still works).
    // Create an OAuth client of type "Web application" in Google Cloud, add the extension's redirect address
    // (https://<extension id>.chromiumapp.org/, shown in the app's sign-in drawer) and paste its client ID. No secret is needed.
    'google_client_id' => '',                           // '1234567890-abc.apps.googleusercontent.com'

    // 1.27.0 (CONTRACT 95): ScopeDue's paid plan, USD 2.90 a month through Stripe. Off until the first three are set.
    // In Stripe: a Product with one recurring Price of USD 2.90 a month (its price_… id below; any other amount or interval is
    // refused); a webhook endpoint https://scopedue.com/api/api.php/v1/billing/stripe for checkout.session.completed,
    // customer.subscription.created / updated / deleted, invoice.paid, invoice.payment_failed (its signing secret below);
    // the customer portal turned on (Settings > Billing > Customer portal) with "Cancel subscriptions" and "Update payment methods".
    // 'stripe_secret'         => 'sk_live_…',          // or a restricted key: write on Customers, Checkout Sessions, Customer portal; read on Prices, Subscriptions
    // 'stripe_webhook_secret' => 'whsec_…',
    // 'stripe_price'          => 'price_…',
    // 'stripe_tax'            => false,                // true only once Stripe Tax is set up in the Stripe dashboard
    // 'billing_url'           => 'https://scopedue.com/api/paid.html',   // where Stripe sends the buyer back (this is the default)

    // Throw-away email addresses are refused when an account is made (the list is inside api.php; tools/build_blocklist.py refreshes it).
    'block_disposable' => true,
    'allow_domains'    => [],                           // never treated as throw-away, with their subdomains: ['mycompany.com']
    'block_domains'    => [],                           // extra domains to refuse; or put one per line in blocklist.txt

    // v60, the delivery clocks: review reminders, "accepted by default", fix-period reminders and pause notices go out
    // after any request (at most once a minute). For them to go out on time when nobody opens the app, add a cron job
    // (hPanel > Advanced > Cron Jobs) every 5 minutes:  curl -s "https://example.com/api.php?r=/v1/tick" > /dev/null

    // v63+, team sync: a project travels as one encrypted request of up to 2 MB. Set post_max_size to 2M or more
    // (hPanel > Advanced > PHP Configuration). /v1/health reports "limits": {"team": true} when it is enough.
];
