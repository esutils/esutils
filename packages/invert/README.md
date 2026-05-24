# A minimal invert library that implemented in `typescript`

This is used for invert a javascript plain object dictionary, for example:

```typescript
export const TYPE = {
  // 3.2.2. TYPE values https://datatracker.ietf.org/doc/html/rfc1035#section-3.2.2
  A: 0x01,
  NS: 0x02,
  MD: 0x03,
  MF: 0x04,
};
export const TYPE_INVERTED = invert(TYPE);
```
