# 2525C CoT Message Cheatsheet for TAK

## Basic Message Structure
```xml
<event version='2.0' uid='abc123' type='a-f-G-U-C-I' time='2020-12-15T14:30:00Z' start='2020-12-15T14:30:00Z' stale='2020-12-15T15:30:00Z' how='m-g'>
  <point lat='38.8769' lon='-77.0365' hae='9999999' ce='9999999' le='9999999'/>
  <detail>
    <contact callsign='Unit1'/>
    <remarks>Additional info</remarks>
    <archive/>
    <status readiness='true'/>
    <usericon iconsetpath='COT_MAPPING_2525B/a-f/a-f-G-U-C-I'/>
    <color argb='-1'/>
    <precisionlocation geopointsrc='User' altsrc='DTED2'/>
  </detail>
</event>
```

## Key Elements
- `event` attributes:
	- `version`: CoT schema version (always 2.0)
	- `uid`: Unique ID
	- `type`: CoT type that determines 2525C icon (see below for possible values)
	- `time`: Event creation time (ISO 8601 format)
	- `start`: Event start time (ISO 8601 format)
	- `stale`: Event expiration time (ISO 8601 format)
	- `how`: Source of the event info. Possible values:
		- `m-g`: machine-generated
		- `h-g`: human-generated
		- `m-g-i`: machine-generated infrared
		- `h-g-i`: human-generated infrared
- `point`: Specifies icon location
	- `lat`/`lon`: in decimal degrees
	- `hae`: altitude in meters above WGS84 ellipsoid
	- `ce`/`le`: circular/linear error in meters (default: 9999999)
- `detail`: Additional info about the event

## `type` Field (2525C Symbol)
- Format: `a-AFFILIATION-BATTLEDIMENSION-FUNCTIONID-SYMBOLMODIFIER11-SYMBOLMODIFIER12`
- `AFFILIATION` (2nd field):
	- `f`: Friendly
	- `h`: Hostile
	- `n`: Neutral
	- `u`: Unknown
	- `p`: Pending
	- `s`: Suspect
	- `g`: Exercise Pending
	- `w`: Exercise Unknown
	- `d`: Exercise Friend
	- `m`: Exercise Neutral
	- `a`: Assumed Friend
	- `j`: Joker
	- `k`: Faker
- `BATTLEDIMENSION` (3rd field):
	- `G`: Ground
	- `A`: Air
	- `S`: Sea Surface
	- `U`: Subsurface
	- `F`: SOF
	- `M`: Missile
	- `P`: Space
	- `Z`: Unknown
- See [MIL-STD-2525C](https://www.jcs.mil/Portals/36/Documents/Doctrine/Other_Pubs/ms_2525c.pdf) for valid combinations of the other fields

## Additional Details
- `contact`:
	- `callsign`: Callsign or name
- `remarks`: Free text for additional info
- `archive`: Presence marks event as archived
- `status`:
	- `readiness`: true or false for unit readiness state
- `usericon`:
	- `iconsetpath`: Custom icon path (can use 2525B icon path)
- `color`: Icon color in ARGB format (e.g., `-1` for white)
- `precisionlocation`:
	- `geopointsrc`: Source of lat/lon. Possible values: 'User', 'GPS'
	- `altsrc`: Source of altitude. Possible values: 'DTED0', 'DTED1', 'DTED2', 'GPS'

## Modifiers and Amplifiers
- Symbol modifiers and amplifiers provide extra info (e.g., unit size, mobility)
- Modifiers: In `type`, fields after the dash following the Function ID are symbol modifiers
	- Example: In `a-f-G-U-C-I-M`, last field `M` is a symbol modifier
	- See MIL-STD-2525C for possible modifier values
- Amplifiers: Separate elements under `detail`
	- Example: `<echelon>4</echelon>` is an amplifier indicating a unit size of Battalion/Regiment
	- See MIL-STD-2525C for possible amplifier elements and values
