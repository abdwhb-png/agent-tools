---
name: laravel-phone
description: Use when working with phone number validation, formatting, parsing, or storage in a Laravel application using the propaganistas/laravel-phone package (libphonenumber integration).
---

# Laravel Phone

## Overview

`propaganistas/laravel-phone` adds full phone number validation, formatting, and parsing to Laravel via Google's **libphonenumber**. Use it for input validation, Eloquent casting, and storing/searching phone numbers correctly in a database.

## Installation

```bash
composer require propaganistas/laravel-phone
```

Service Provider is auto-discovered. Add the translation key to every `lang/*/validation.php`:

```php
'phone' => 'The :attribute field must be a valid number.',
```

---

## Validation

Use the `phone` keyword in rules, or the expressive `Phone` rule class.

### Country-constrained

```php
// String rule
'phone' => 'phone:US,BE',

// Rule object
'phone' => (new \Propaganistas\LaravelPhone\Rules\Phone)->country(['US', 'BE']),
```

### Dynamic country from another field

By convention, name the country field `{phone_field}_country` for automatic discovery:

```php
'phone'         => 'phone',
'phone_country' => 'required_with:phone',
```

Or reference a custom field name:

```php
'phone'        => 'phone:country_field',
'country_field' => 'required_with:phone',
```

### Accept any internationally-formatted number

```php
'phone' => 'phone:INTERNATIONAL,BE',
// Rule: (new Phone)->international()->country('BE')
```

### Type constraints

```php
'phone' => 'phone:mobile',                  // only mobile
'phone' => 'phone:fixed_line',             // only fixed line
'phone' => 'phone:!mobile',               // blacklist mobile
// Rule: (new Phone)->type('mobile')
// Rule: (new Phone)->notType('mobile')
// Also accepts libphonenumber\PhoneNumberType enum constants
```

### Lenient (length-only) validation

```php
'phone' => 'phone:LENIENT',
// Rule: (new Phone)->lenient()
```

---

## Attribute Casting (Eloquent)

Two casts convert database values ↔ `PhoneNumber` objects automatically.

```php
use Propaganistas\LaravelPhone\Casts\RawPhoneNumberCast;
use Propaganistas\LaravelPhone\Casts\E164PhoneNumberCast;

class User extends Model
{
    protected $casts = [
        'phone_1' => RawPhoneNumberCast::class . ':BE',   // stores raw input
        'phone_2' => E164PhoneNumberCast::class . ':BE',  // stores E.164
    ];
}

$user->phone; // PhoneNumber object or null
```

### Cast country resolution (3 options)

1. **Auto-detect** – a sibling `phone_country` attribute (same name + `_country` suffix)
2. **Attribute name** – `RawPhoneNumberCast::class . ':country_field'`
3. **Hard-coded code** – `E164PhoneNumberCast::class . ':BE'`

### ⚠️ `E164PhoneNumberCast` assignment order

Laravel applies casts immediately on `set`. Set the country **before** the phone:

```php
// ✅ Correct
$model->phone_country = 'BE';
$model->phone = '012 34 56 78';

// ✅ Correct with fill()
$model->fill(['phone_country' => 'BE', 'phone' => '012 34 56 78']);

// ❌ Wrong – country is empty when cast runs
$model->phone = '012 34 56 78';
$model->phone_country = 'BE';
```

---

## PhoneNumber Utility Class

Wrap any phone string in `PhoneNumber` for rich methods. Casts to E.164 automatically.

```php
use Propaganistas\LaravelPhone\PhoneNumber;

$phone = new PhoneNumber('012/34.56.78', 'BE');

// Or use the global helper (returns PhoneNumber or formatted string)
phone('+3212345678');
phone('012 34 56 78', 'BE');
phone('012 34 56 78', 'BE', $format); // returns string
```

### Formatting

```php
$phone->formatE164();           // +3212345678
$phone->formatInternational();  // +32 12 34 56 78
$phone->formatNational();       // 012 34 56 78
$phone->formatRFC3966();        // tel:+32-12-34-56-78
$phone->format($format);        // libphonenumber\PhoneNumberFormat constant

// Dialable formats per country
$phone->formatForCountry('NL');                    // 00 32 12 34 56 78
$phone->formatForMobileDialingInCountry('NL');     // +3212345678
```

### Number Information

```php
$phone->getType();               // libphonenumber\PhoneNumberType::FIXED_LINE
$phone->isOfType('mobile');      // false
$phone->getCountry();            // 'BE'
$phone->isOfCountry('BE');       // true
```

### Equality Comparison

```php
$phone->equals('012/34.56.78', 'BE');   // true
$phone->equals('+32 12 34 56 78');      // true
$phone->equals($anotherPhone);          // true/false

$phone->notEquals('045 67 89 10', 'BE'); // true
```

---

## Database Storage Strategies

### 1. Uniqueness – store E.164 only

```
phone (varchar) = +3212345678
```

### 2. Preserve raw input – store raw + country

```
phone         (varchar) = 012/34.56.78
phone_country (varchar) = BE
```

### 3. Searchable – store normalized variants

Use a model `saving` observer:

```php
public function saving(User $user): void
{
    if ($user->isDirty('phone') && $user->phone) {
        $user->phone_normalized = preg_replace('/[^0-9]/', '', $user->phone);
        $user->phone_national   = preg_replace('/[^0-9]/', '', phone($user->phone, $user->phone_country)->formatNational());
        $user->phone_e164       = phone($user->phone, $user->phone_country)->formatE164();
    }
}
```

Search query:

```php
User::where(function ($q) use ($search) {
    $q->where('phone_normalized', 'LIKE', preg_replace('/[^0-9]/', '', $search) . '%')
      ->orWhere('phone_national',   'LIKE', preg_replace('/[^0-9]/', '', $search) . '%')
      ->orWhere('phone_e164',       'LIKE', preg_replace('/[^+0-9]/', '', $search) . '%');
});
```

---

## Quick Reference

| Task | Code |
|------|------|
| Install | `composer require propaganistas/laravel-phone` |
| Validate any valid number | `'phone' => 'phone'` |
| Validate for country | `'phone' => 'phone:US'` |
| Validate mobile only | `'phone' => 'phone:mobile'` |
| Accept international too | `'phone' => 'phone:INTERNATIONAL,BE'` |
| Lenient (length only) | `'phone' => 'phone:LENIENT'` |
| Store raw input + country | `RawPhoneNumberCast::class . ':BE'` |
| Store E.164 in DB | `E164PhoneNumberCast::class . ':BE'` |
| Format E.164 | `$phone->formatE164()` |
| Format national | `$phone->formatNational()` |
| Get country | `$phone->getCountry()` |
| Get type | `$phone->getType()` |
| Compare numbers | `$phone->equals(...)` |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Setting phone before country with `E164PhoneNumberCast` | Always set `phone_country` first |
| Storing local format without country in DB | Store E.164 or always keep a paired `_country` column |
| Searching with `=` on locally-formatted numbers | Use normalized variant columns + LIKE search |
| Expecting casts to work on invalid numbers | Validate before saving – casts expect valid numbers |
| Using `phone:mobile` with VOIP numbers | Add `phone:mobile,voip` or check `libphonenumber\PhoneNumberType` |
