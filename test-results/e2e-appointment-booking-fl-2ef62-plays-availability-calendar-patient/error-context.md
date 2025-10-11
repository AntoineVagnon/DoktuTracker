# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]:
        - img [ref=e8]
        - heading "Cookie Preferences" [level=3] [ref=e10]
      - button [ref=e11] [cursor=pointer]:
        - img
    - paragraph [ref=e12]:
      - text: We use cookies and similar technologies to help personalize content, tailor and measure ads, and provide a better experience. By clicking accept, you agree to this, as outlined in our
      - link "Privacy Policy" [ref=e13] [cursor=pointer]:
        - /url: /privacy
      - text: .
    - generic [ref=e14]:
      - button "Manage Preferences" [ref=e15] [cursor=pointer]
      - button "Reject All" [ref=e16] [cursor=pointer]
      - button "Accept All" [ref=e17] [cursor=pointer]
  - region "Notifications (F8)":
    - list
  - generic [ref=e19]:
    - heading "Error Loading Doctor" [level=2] [ref=e20]
    - paragraph [ref=e21]: "Error: Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"
    - paragraph [ref=e22]: "Doctor ID: 8"
```