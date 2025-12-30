# Performance Optimization Recommendations

**Date**: 2025-12-30
**Based On**: PERFORMANCE_BASELINE.md
**Status**: Actionable Items for Phase 3+

---

## Quick Wins (High ROI, Low Effort)

### 1. Lazy Load Export Libraries 🎯 HIGHEST PRIORITY

**Current State**: Export libraries (xlsx, jspdf) loaded in vendor-export chunk (978 kB / 304 kB gzipped)

**Problem**: Export features rarely used, but libraries loaded on every page load

**Solution**: Dynamic import export libraries only when user clicks Export button

**Implementation**:
```typescript
// In export dialogs/components
const handleExport = async () => {
  const { utils, writeFile } = await import('xlsx');
  const { jsPDF } = await import('jspdf');
  // ... export logic
};
```

**Impact**:
- **Savings**: ~300 kB gzipped
- **Load Time Improvement**: ~2.4s on 3G, ~0.24s on 4G
- **Effort**: 1-2 hours
- **Risk**: Low

**Files to Modify**:
- Export dialogs in storefront module
- Report export features in analytics
- Any PDF generation features

---

### 2. Lazy Load Charts on Analytics Routes 📊

**Current State**: Recharts loaded in vendor-charts chunk (300 kB / 78 kB gzipped)

**Problem**: Charts only used in Analytics/Reports modules, but loaded everywhere

**Solution**: Lazy load Recharts vendor chunk on analytics routes

**Implementation**:
```typescript
// In App.tsx or route config
const AnalyticsDashboard = lazy(() => import('@/pages/analytics/page'));
```

**Impact**:
- **Savings**: ~75 kB gzipped (from initial bundle)
- **Load Time Improvement**: ~0.6s on 3G
- **Effort**: 1 hour
- **Risk**: Low

**Files to Modify**:
- [src/App.tsx](src/App.tsx) route definitions
- Analytics page imports

---

## Medium Priority Optimizations

### 3. Split Storefront Pages Chunk

**Current State**: Largest page chunk at 277 kB (64 kB gzipped)

**Problem**: All storefront pages bundled together

**Solution**: Split by major features (catalog, orders, customers)

**Implementation**:
- Review route structure in [src/App.tsx](src/App.tsx)
- Split into 2-3 route groups with separate chunks

**Impact**:
- **Savings**: ~20-30 kB gzipped per split
- **Effort**: 2-3 hours
- **Risk**: Medium (requires testing all routes)

---

### 4. Fix Dynamic Import Warnings

**Current State**: Build warnings about static imports preventing code splitting

**Warning Example**:
```
fleetops/page.tsx is dynamically imported by SecondarySidebar.tsx
but also statically imported by App.tsx
```

**Problem**: App.tsx statically imports routes that should be lazy-loaded

**Solution**: Make App.tsx use consistent lazy imports

**Implementation**:
```typescript
// Change from:
import FleetOpsPage from '@/pages/fleetops/page';

// To:
const FleetOpsPage = lazy(() => import('@/pages/fleetops/page'));
```

**Impact**:
- **Savings**: Better code splitting (unclear magnitude)
- **Effort**: 2-4 hours
- **Risk**: Medium (test all route transitions)

**Files to Modify**:
- [src/App.tsx](src/App.tsx)
- [src/components/layout/SecondarySidebar.tsx](src/components/layout/SecondarySidebar.tsx)

---

## Low Priority / Future Considerations

### 5. Bundle Analyzer Deep Dive

**Tool**: rollup-plugin-visualizer or vite-bundle-visualizer

**Purpose**: Visual treemap of bundle contents to find duplicate deps

**Implementation**:
```bash
npm install -D rollup-plugin-visualizer
# Add to vite.config.ts plugins
```

**Effort**: 1 hour setup + analysis time

---

### 6. Evaluate Lighter Chart Library

**Current**: Recharts (300 kB)
**Alternatives**:
- Chart.js (~150 kB)
- Victory (~180 kB)
- Nivo (~200 kB)

**Effort**: 1-2 days (requires UI redesign)
**Risk**: High (breaking change to all charts)
**Recommendation**: Only if charts become performance bottleneck

---

## Implementation Roadmap

### Phase 3 Sprint 1 (Quick Wins)
1. ✅ Week 1: Lazy load export libraries (#1)
2. ✅ Week 1: Lazy load charts on analytics routes (#2)

**Expected Savings**: ~375 kB gzipped (1.03 MB → 655 kB)
**Load Time Improvement**: ~3s on 3G, ~0.3s on 4G

### Phase 3 Sprint 2 (Medium Priority)
3. Week 2: Split storefront pages chunk (#3)
4. Week 2: Fix dynamic import warnings (#4)

**Expected Savings**: ~20-30 kB additional
**Total Savings**: ~400 kB gzipped (1.03 MB → 630 kB)

### Phase 3+ (Future)
5. Bundle analyzer analysis (#5)
6. Evaluate chart library alternatives (#6) - only if needed

---

## Success Metrics

After implementing quick wins (#1, #2):

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Initial Bundle (Gzip) | 1.03 MB | 655 kB | -36% |
| 3G Load Time | ~8.5s | ~5.5s | -3s |
| 4G Load Time | ~1.6s | ~1.3s | -0.3s |

---

## Not Recommended

### ❌ Remove React Query
- **Why**: Too deeply integrated, high refactor cost
- **Savings**: Minimal (included in vendor-react)

### ❌ Replace Leaflet
- **Why**: Best-in-class for maps, no lighter alternatives
- **Savings**: None (maps require heavy libraries)

### ❌ Remove Supabase Client
- **Why**: Core dependency for data layer
- **Savings**: None (essential)

### ❌ Aggressive Tree Shaking
- **Why**: Vite already does this well
- **Savings**: Minimal (<10 kB)

---

## Monitoring Plan

After implementing optimizations:

1. **Re-run Performance Baseline**
   - Measure new bundle sizes
   - Verify savings match estimates

2. **Lighthouse Audits**
   - Performance score target: >70
   - Compare before/after

3. **Real User Monitoring (RUM)**
   - Track actual load times in production
   - Monitor by network type

---

## Conclusion

**Highest Impact Actions**:
1. Lazy load export libraries (300 kB savings)
2. Lazy load charts on analytics (75 kB savings)

**Total Potential**: ~400 kB gzipped savings (36% bundle reduction)

**Recommendation**: Implement #1 and #2 in Phase 3 Sprint 1 for maximum ROI with minimal effort.

---

**Document Owner**: Claude Sonnet 4.5
**Last Updated**: 2025-12-30
**Next Review**: After Phase 3 Sprint 1 implementation
