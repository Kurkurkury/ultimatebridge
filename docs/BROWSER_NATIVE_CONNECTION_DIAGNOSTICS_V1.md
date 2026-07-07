# Browser / Native Connection Diagnostics V1

This milestone adds report-only diagnostics for the browser extension to native host connection.

## Purpose

When native messaging fails, the operator needs to know whether the problem is likely in:

```text
extension reload
popup to service worker route
native messaging permission/API
native host name
install plan
extension id plan
manifest or registry setup
```

## Popup controls

The popup now includes:

```text
Show browser/native diagnostics
Copy browser/native diagnostics
```

The report is displayed in:

```text
connection-diagnostics
```

## Service worker route

The popup requests:

```text
ULTIMATEBRIDGE_GET_CONNECTION_DIAGNOSTICS
```

The service worker returns a report using:

```text
ULTIMATEBRIDGE_BROWSER_NATIVE_CONNECTION_DIAGNOSTICS_V1
```

## What the report shows

```text
native host name
extension id
manifest version
extension name
chrome runtime availability
service worker reachability
native messaging API availability
delivery queue length
upload plan presence
recommended install plan command
recommended extension id plan command
```

## Native host name alignment

The browser transport uses:

```text
com.ultimatebridge.host
```

The install plan and extension id helper now use the same host name.

This is important because Chrome and Edge native messaging require the browser-side host name and registry/manifest host name to match.

## Safety

The diagnostics are report-only.

They do not:

```text
send a native message
run READ_ONLY smoke
submit browser messages
apply SAFE_CHANGE
write registry keys
write native host manifests
upload artifacts
run rollback
git push
git merge
```

The real native smoke remains a separate manual button:

```text
Run native read-only smoke
```

## Smoke

```powershell
npm run smoke:browser-native-connection-diagnostics
```

The smoke checks:

```text
diagnostics model exists
popup buttons exist
popup output exists
popup requests diagnostics route
service worker exposes diagnostics route
native client exports native host name
install plan uses same host name
extension id helper uses same host name
diagnostics are report-only
verify-local includes this smoke
```

## Full verification

```powershell
npm run verify:local
```

The full local verification stack now includes:

```text
npm run smoke:browser-native-connection-diagnostics
```
