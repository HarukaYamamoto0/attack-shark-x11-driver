# Unknown Events

> To better understand this document, read the `README.md` located in the root of this directory first.

The packets below represent messaging events whose meaning has not yet been identified.

During reverse engineering, I could not establish a direct relationship between these events and any known device function. Some of them appear to be somewhat random, although they are occasionally observed together with command response messages.

At this point, there is not enough evidence to determine whether these packets represent internal device state changes, status notifications, timing-related events, or another type of asynchronous message.

The following packets have been observed on the Attack Shark X11:

```text
03 55 ff ff 00

03 55 ff ff ff

---

03 55 fc ff ff

---

03 55 ed ff fc

---

03 55 9c ff c7

---

03 55 fd ff f4
03 55 fd ff 04

---

03 55 fe ff fe

---

03 55 02 00 00

---

03 55 03 00 fb

---

03 55 10 00 00

---

03 55 00 00 01 // Device successfully opened?

---

03 55 00 00 ff
```

The `0x00` event is particularly interesting because it is normally observed when the **Reset Profile** button is pressed:

```text
03 55 00 00 ff
```

However, the exact meaning of this event has not yet been confirmed.

Additional observations are required before these events can be assigned a definitive meaning.
