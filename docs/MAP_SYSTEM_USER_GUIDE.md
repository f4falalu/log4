# Biko Map System - User Guide

## 📘 Complete Guide for All Users

**Version:** 1.0.0
**Last Updated:** December 23, 2025
**Audience:** Planners, Dispatchers, Analysts

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Planning Mode](#planning-mode)
4. [Operational Mode](#operational-mode)
5. [Forensics Mode](#forensics-mode)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is the Biko Map System?

The Biko Map System is a comprehensive geospatial tool designed for health logistics operations. It provides three specialized modes:

- **Planning Mode** - Design service zones, routes, and facility assignments
- **Operational Mode** - Manage real-time delivery reassignments (Trade-Offs)
- **Forensics Mode** - Analyze historical performance and patterns

### Three Core Workflows

```
Planning Mode:  Draft → Review → Activate
Operational Mode: Select → Choose → Confirm → Execute
Forensics Mode: Select Time → Analyze → Export
```

### Who Uses What?

| Role | Primary Mode | Use Cases |
|------|-------------|-----------|
| Operations Managers | Planning | Zone design, facility assignments |
| Dispatchers | Operational | Real-time reassignments |
| Analysts | Forensics | Performance analysis, reporting |

---

## Getting Started

### Accessing the Map System

1. Log in to Biko FleetOps
2. Click **Map System** in the left navigation menu
3. Choose your mode:
   - **Operational** - For live dispatch operations
   - **Planning** - For strategic configuration
   - **Forensics** - For historical analysis

### Map Navigation

| Action | How To |
|--------|--------|
| Pan map | Click and drag |
| Zoom in | Scroll up or use + button |
| Zoom out | Scroll down or use - button |
| Reset view | Click home icon |

### Understanding Map Elements

- **Green markers** - Active delivery vehicles
- **Blue markers** - Facilities/warehouses
- **Purple polygons** - Service zones
- **Orange lines** - Active routes
- **Red markers** - Exceptions/delays

---

## Planning Mode

**Purpose:** Design and configure service zones, routes, and facility assignments

### Workflow: Draft → Review → Activate

⚠️ **CRITICAL:** All changes start as **drafts (inactive)** and must be explicitly activated to take effect.

---

### Tool 1: Distance Measurement

**When to use:** Measure distances between locations for planning

**Steps:**
1. Click the **Ruler icon** in the toolbar
2. Click on the map to add points
3. View real-time distance calculation
4. Click **Clear** to start over
5. Click **Close** when done

**Tips:**
- Distances shown in kilometers
- Click multiple points for multi-segment routes
- Use for estimating delivery times

---

### Tool 2: Zone Editor

**When to use:** Create or edit service zone boundaries

**Steps:**
1. Click the **MapPin icon** in the toolbar
2. Click **Draw Zone** button
3. Click on map to create polygon vertices
4. Double-click to complete the polygon
5. Enter zone name (required)
6. Add description (optional)
7. Click **Save as Draft**

**Draft Workflow:**
```
Draw Zone → Name Zone → Save as Draft → Review → Activate
```

**Important Notes:**
- Zones are saved with `active=false` (draft mode)
- Must be activated in Review & Activate dialog
- Can create multiple versions of the same zone
- Only one version can be active at a time

**Tips:**
- Name zones clearly (e.g., "North Abuja District")
- Use descriptions for notes about coverage
- Keep zones reasonably sized (not too large)

---

### Tool 3: Facility Assigner

**When to use:** Assign facilities to service zones

**Steps:**
1. Click the **Building icon** in the toolbar
2. Select a **Target Zone** from dropdown
3. Choose **Assignment Type**:
   - Primary (main zone responsibility)
   - Secondary (backup coverage)
   - Backup (emergency coverage)
4. Search for facilities in the search box
5. Click checkboxes to select facilities
   - OR click **Select All** for bulk operations
6. Click **Assign** button

**Assignment Process:**
```
Select Zone → Choose Facilities → Select Type → Assign → Review → Activate
```

**Tips:**
- Use search to filter by facility name, state, or type
- Batch assign multiple facilities at once
- Assignments are drafts until activated
- Check Review dialog for conflicts (duplicate assignments)

---

### Tool 4: Route Sketch

**When to use:** Create non-binding route previews for planning

**Steps:**
1. Click the **Route icon** in the toolbar
2. Enter **Route Name** (required)
3. Add **Description** (optional)
4. Select **Route Type** (delivery/pickup/transfer)
5. Optional: Select start/end facilities
6. Click on map to add waypoints:
   - First click = Start (green marker)
   - Middle clicks = Waypoints (blue markers)
   - Last click = End (red marker)
7. Drag markers to adjust positions
8. Review metrics (waypoints, distance, time)
9. Click **Save**

**Route Planning:**
```
Name Route → Add Waypoints → Review Metrics → Save → Activate
```

**Important Notes:**
- Route sketches are **non-binding** (active=false)
- System calculates distance automatically
- Estimated time based on 40 km/h average
- Waypoints can be dragged after placement

**Tips:**
- Name routes descriptively (e.g., "Main Distribution Route - North")
- Use waypoints for critical stops
- Save multiple route options for comparison

---

### Tool 5: Review & Activate

**When to use:** Review all drafts and activate configurations

**Steps:**
1. Click the **green checkmark icon** in the toolbar
2. Review tabs:
   - **Zones** - Draft zone configurations
   - **Routes** - Draft route sketches
   - **Assignments** - Draft facility assignments
3. Check for **conflicts** (shown in red banner)
4. Select items to activate (checkboxes)
5. Click **Activate (X)** button
6. Confirm activation

**Conflict Types:**
- ❌ Duplicate zone names
- ❌ Facility assigned to multiple zones
- ⚠️ Must resolve conflicts before activation

**Activation Process:**
```
Review Drafts → Check Conflicts → Select Items → Activate → Verify
```

**What Happens When You Activate:**
- Zone: `active=true`, previous version deactivated
- Route: `active=true`, becomes visible to dispatchers
- Assignment: `active=true`, facilities linked to zones

**Tips:**
- Activate related items together (zone + assignments)
- Check "Version" number for zones
- Review counts: "X of Y selected"
- Activation is immediate - no undo!

---

## Operational Mode

**Purpose:** Manage real-time delivery reassignments (Trade-Offs)

### What is a Trade-Off?

A Trade-Off is the **ONLY** mechanism for reassigning deliveries between vehicles during operations. It requires:
- Source vehicle with items to reassign
- Receiving vehicle(s) to take items
- Handover point where transfer happens
- Confirmation from all drivers involved

### Trade-Off Workflow

```
Select Source → Choose Items → Select Receivers → Place Handover → Confirm → Execute
```

---

### Initiating a Trade-Off

**When to use:**
- Vehicle breakdown or delay
- Route optimization opportunities
- Capacity rebalancing
- Emergency reassignments

**Steps:**
1. Click **Initiate Trade-Off** button
2. **Step 1: Select Source Vehicle**
   - Click on vehicle marker on map
   - OR select from dropdown
   - View vehicle's current deliveries
3. **Step 2: Select Items to Transfer**
   - Check boxes for deliveries/batches
   - Can select entire batches or specific stops
4. **Step 3: Choose Receiving Vehicle(s)**
   - Select one or more vehicles
   - System shows capacity and location
5. **Step 4: Place Handover Point**
   - Click on map for meeting location
   - Adjust if needed
6. **Step 5: Review & Submit**
   - Check metrics (time saved, distance saved)
   - Click **Submit for Confirmation**

**Trade-Off States:**
- `Draft` - Being created
- `Pending Confirmation` - Waiting for drivers
- `Confirmed` - All drivers agreed
- `Executing` - In progress
- `Completed` - Successfully finished
- `Rejected` - Driver(s) declined
- `Cancelled` - Cancelled by dispatcher

---

### Multi-Party Confirmation

**How It Works:**
1. Dispatcher submits Trade-Off
2. Notifications sent to all drivers involved
3. Each driver must confirm or reject
4. Trade-Off proceeds only if ALL confirm
5. If ANY reject, Trade-Off is cancelled

**Driver Confirmation:**
- Source driver: Confirms giving up deliveries
- Receiving driver(s): Confirms accepting deliveries
- All must agree within time limit

**Monitoring Status:**
```
Pending → Driver 1 Confirmed → Driver 2 Confirmed → Executing
```

---

### Trade-Off Best Practices

**DO:**
- ✅ Choose nearby handover points
- ✅ Consider driver capacities
- ✅ Check estimated time savings
- ✅ Communicate with drivers beforehand
- ✅ Monitor confirmation status

**DON'T:**
- ❌ Create Trade-Offs during active deliveries
- ❌ Choose far-away handover points
- ❌ Overload receiving vehicles
- ❌ Submit without checking capacity
- ❌ Cancel confirmed Trade-Offs unnecessarily

---

## Forensics Mode

**Purpose:** Analyze historical performance and patterns

**Key Feature:** Read-only mode - no data can be edited

---

### Tool 1: Route Comparison

**When to use:** Compare planned routes vs actual paths taken

**Steps:**
1. Click the **Route icon** in the analysis toolbar
2. Select a delivery batch from dropdown
3. Choose time range with timeline scrubber
4. View overlay:
   - Blue line = Planned route
   - Orange line = Actual route
   - Red segments = Deviations
5. Review metrics panel:
   - Planned distance vs Actual distance
   - Planned time vs Actual time
   - Deviation percentage

**Use Cases:**
- Identify route inefficiencies
- Understand why delays occurred
- Validate route planning accuracy

---

### Tool 2: Performance Heatmap

**When to use:** Visualize performance across service areas

**Steps:**
1. Click the **Activity icon** in the analysis toolbar
2. Select **Metric** from dropdown:
   - On-Time Delivery Rate
   - Delay Hotspots
   - Exception Density
   - Trade-Off Density
3. Adjust timeline scrubber for time range
4. Analyze heatmap colors:
   - Green = Good performance
   - Yellow = Moderate issues
   - Red = Poor performance

**Metrics Explained:**
- **On-Time**: % of deliveries completed on schedule
- **Delays**: Areas with frequent late deliveries
- **Exceptions**: Regions with most problems
- **Trade-Offs**: Frequency of reassignments

**Use Cases:**
- Identify problem areas
- Allocate resources to high-delay zones
- Track performance improvements over time

---

### Tool 3: Trade-Off History

**When to use:** Analyze past Trade-Off events

**Steps:**
1. Click the **GitBranch icon** in the analysis toolbar
2. Select **Status Filter**:
   - All Trade-Offs
   - Completed
   - Rejected
   - Cancelled
3. Adjust timeline for date range
4. Click markers on map to view details:
   - Source vehicle
   - Receiving vehicles
   - Handover point
   - Outcome (success/failure)
   - Time/distance saved

**Color Coding:**
- 🟢 Green = Completed successfully
- 🔴 Red = Rejected by drivers
- ⚪ Gray = Cancelled by dispatcher

**Use Cases:**
- Review Trade-Off success rates
- Identify patterns in rejections
- Calculate operational efficiency gains

---

### Timeline Scrubber

**Purpose:** Navigate through historical data

**Controls:**
- **Play** ▶️ - Auto-advance through time
- **Pause** ⏸️ - Stop playback
- **Step Back** ⏮️ - Move back 5% (1.2 hours)
- **Step Forward** ⏭️ - Move forward 5%
- **Slider** - Drag to specific time

**Time Range:** 24 hours from current time

**Playback:**
- Speed: 1% per 200ms
- Direction: Past → Present
- Auto-stop: At 100% (current time)

**Tips:**
- Pause to analyze specific moments
- Step through critical events
- Combine with other tools for analysis

---

## Best Practices

### Planning Mode Best Practices

**Zone Design:**
- Keep zones contiguous (no islands)
- Size zones based on delivery volume
- Name zones geographically (North/South/East/West)
- Review zone boundaries quarterly

**Facility Assignments:**
- Assign facilities to nearest zones
- Use secondary assignments for border facilities
- Review assignments when zones change
- Document assignment rationale

**Route Sketching:**
- Create multiple route options
- Test routes before activation
- Consider time-of-day traffic
- Update routes based on actual performance

**Draft Management:**
- Don't accumulate too many drafts
- Review and activate regularly
- Delete outdated drafts
- Use descriptive names/descriptions

---

### Operational Mode Best Practices

**Trade-Off Initiation:**
- Verify vehicle locations before initiating
- Choose central handover points
- Consider driver break times
- Communicate reasons to drivers

**Confirmation Management:**
- Set realistic confirmation timeouts
- Have backup plans if rejected
- Monitor confirmation status actively
- Don't cancel unnecessarily

**Performance Optimization:**
- Review "Estimated Time Saved" metric
- Target high-impact Trade-Offs
- Avoid frequent small reassignments
- Track success rates

---

### Forensics Mode Best Practices

**Analysis Frequency:**
- Daily: Check exception hotspots
- Weekly: Review Trade-Off success rates
- Monthly: Analyze route performance
- Quarterly: Strategic zone optimization

**Data Interpretation:**
- Compare time periods (week-over-week)
- Look for patterns, not one-off events
- Cross-reference multiple metrics
- Share findings with operations team

**Reporting:**
- Export heatmap screenshots
- Document insights in reports
- Track improvement over time
- Present recommendations to leadership

---

## Troubleshooting

### Common Issues

#### Map Not Loading
**Symptoms:** Blank screen, spinner indefinitely
**Solutions:**
1. Refresh the browser (Ctrl+F5 or Cmd+R)
2. Clear browser cache and cookies
3. Check internet connection
4. Try different browser (Chrome recommended)
5. Contact IT if persists

#### Zone Won't Save
**Symptoms:** Error message after clicking "Save as Draft"
**Solutions:**
1. Check zone name is filled in
2. Ensure polygon is closed (double-click to complete)
3. Verify you're authenticated (re-login if needed)
4. Try smaller zone (if very large polygon)
5. Contact support with error message

#### Trade-Off Confirmation Stuck
**Symptoms:** Waiting for confirmations, nothing happening
**Solutions:**
1. Check driver connectivity (are they online?)
2. Verify drivers received notifications
3. Contact drivers directly (phone/radio)
4. Consider cancelling and re-creating
5. Check database for confirmation records

#### Heatmap Not Displaying
**Symptoms:** No colors on map, blank heatmap
**Solutions:**
1. Check selected time range has data
2. Try different metric
3. Expand time range (use full 24 hours)
4. Verify data exists for that period
5. Report to support if data should exist

#### Cannot Activate Drafts
**Symptoms:** "Activate" button disabled in Review dialog
**Solutions:**
1. Check for conflicts (red warning banner)
2. Resolve duplicate zone names
3. Fix overlapping facility assignments
4. Select at least one item to activate
5. Verify you have activation permissions

---

### Getting Help

**In-App Help:**
- Hover over ℹ️ icons for tooltips
- Check workflow reminders (blue banners)
- Review error messages carefully

**Documentation:**
- This User Guide (comprehensive)
- Deployment Guide (for admins)
- API Documentation (for developers)

**Support Channels:**
- **Email:** support@biko.com
- **Slack:** #map-system-help
- **Phone:** +234-XXX-XXXX (urgent only)

**Training:**
- Recorded video tutorials (coming soon)
- Live training sessions (monthly)
- 1-on-1 coaching (request via email)

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Escape | Close active tool/dialog |
| Space | Play/Pause timeline (Forensics) |
| ← → | Step timeline backward/forward |
| +/- | Zoom in/out on map |
| M | Toggle map type (satellite/street) |

---

## Glossary

**Active** - Configuration that is live and affecting operations

**Audit Log** - Record of all actions taken in the map system

**Batch** - Group of deliveries scheduled together

**Capability** - Map mode (operational/planning/forensics)

**Conflict** - Issue preventing activation (duplicate names, etc.)

**Draft** - Configuration saved but not yet active (active=false)

**Forensics** - Historical analysis mode

**Handover Point** - Location where Trade-Off transfer happens

**Heatmap** - Color-coded visualization of performance metrics

**Layer** - Map overlay (vehicles, routes, zones, etc.)

**Planning** - Strategic configuration mode

**Polygon** - Shape drawn to define zone boundaries

**RLS** - Row Level Security (database access control)

**Route Sketch** - Non-binding route preview

**Service Zone** - Geographic area for delivery operations

**Trade-Off** - Reassignment of deliveries between vehicles

**Waypoint** - Stop point along a route

**Zone Configuration** - Service zone definition with settings

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-23 | Initial release |

---

## Feedback

We continuously improve the Map System based on your feedback!

**How to Provide Feedback:**
1. Email suggestions to product@biko.com
2. Report bugs via support@biko.com
3. Join monthly feedback sessions
4. Fill out in-app surveys

**What We Need:**
- What worked well?
- What was confusing?
- What features are missing?
- How can we improve workflows?

---

**End of User Guide**

For the latest updates and training materials, visit the Biko Knowledge Base.
