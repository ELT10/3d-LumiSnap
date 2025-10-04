# 🧪 Testing Guide - AI Workflow UI

## Quick Start

1. **Start the development server:**
```bash
npm run dev
```

2. **Open your browser** to the local URL (usually `http://localhost:5173`)

## Complete Flow Testing

### Path 1: Text-to-3D Generation

#### Step 1: Initial Choice Screen
- [ ] Screen loads with gradient background
- [ ] Three cards are visible and responsive
- [ ] Cards have hover animations
- [ ] Click "Start with Text" button

#### Step 2: Text Prompt Interface
- [ ] Back button works (returns to choice screen)
- [ ] Quick start templates are clickable
- [ ] Clicking a template fills the textarea
- [ ] Textarea accepts input (max 500 chars)
- [ ] Character counter updates correctly
- [ ] "Enhance" button is disabled when empty
- [ ] Style radio buttons are selectable
- [ ] "Generate 3D Model" button is disabled when empty
- [ ] **Test:** Enter prompt and click Generate

#### Step 3: Loading State
- [ ] Loading spinner appears
- [ ] Loading message matches the context
- [ ] Takes ~2 seconds (simulated)

#### Step 4: Image Variation Selector
- [ ] Four images are displayed in a grid
- [ ] Images are clickable
- [ ] Clicking selects an image (shows checkmark)
- [ ] Only one can be selected at a time
- [ ] "Continue to 3D Conversion" is disabled until selection
- [ ] **Test:** Select an image and click Continue

#### Step 5: 3D Conversion Loading
- [ ] Loading screen shows "Converting to 3D..."
- [ ] Takes ~3 seconds (simulated)

#### Step 6: Model Preview
- [ ] 3D canvas renders
- [ ] Source image is shown in sidebar
- [ ] Model info displays correctly
- [ ] Features checklist has green checkmarks
- [ ] Orbit controls work (drag, zoom, pan)
- [ ] **Test:** Click "Start Lighting Simulation"

#### Step 7: Simulation Mode
- [ ] Original app loads with 3D scene
- [ ] Fixture panel is visible
- [ ] "New" button appears in top-left
- [ ] All original features work
- [ ] **Test:** Click "+ New" button returns to choice screen

---

### Path 2: Image-to-3D Upload

#### Step 1: Initial Choice Screen
- [ ] Click "Upload Image" button

#### Step 2: Image Upload Interface
- [ ] Back button works
- [ ] Dropzone is visible with dashed border
- [ ] Hover shows visual feedback
- [ ] **Test drag & drop:**
  - [ ] Dragging file over shows "dragging" state
  - [ ] Dropping file shows preview
- [ ] **Test file browser:**
  - [ ] Click "Browse Files" opens file picker
  - [ ] Selecting image shows preview
- [ ] File validation works (try non-image file)
- [ ] File size validation works (>10MB shows error)

#### Step 3: Preview & Upload
- [ ] Preview image displays correctly
- [ ] File name and size show correctly
- [ ] X button clears preview
- [ ] Tips section is visible
- [ ] "Generate 3D Model" button is enabled
- [ ] **Test:** Click Generate button

#### Step 4-7: Same as Text-to-3D
- Follow steps 3-7 from Path 1

---

### Path 3: Demo Mode

#### Step 1: Initial Choice Screen
- [ ] Click "Try Demo" button

#### Step 2: Simulation Mode (Direct)
- [ ] App loads directly into simulation
- [ ] Uses existing house3 model
- [ ] All features work normally
- [ ] "+ New" button works

---

## Visual Regression Testing

### Gradient Backgrounds
- [ ] **Choice Screen:** Purple gradient (#667eea → #764ba2)
- [ ] **Text Prompt:** Pink gradient (#f093fb → #f5576c)
- [ ] **Image Upload:** Blue gradient (#4facfe → #00f2fe)
- [ ] **Variation Selector:** Purple gradient
- [ ] **Model Preview:** Purple gradient

### Animations
- [ ] Cards fade in with stagger effect
- [ ] Headers slide down
- [ ] Buttons have hover lift effect
- [ ] Transitions are smooth (300ms)

### Responsive Design

#### Desktop (>1200px)
- [ ] All elements properly spaced
- [ ] Grid layouts use full width
- [ ] No horizontal scrolling

#### Tablet (768px - 1200px)
- [ ] Grids adjust to 2 columns
- [ ] Images remain visible
- [ ] No overlap

#### Mobile (<768px)
- [ ] Single column layout
- [ ] Template cards stack vertically
- [ ] Buttons go full width
- [ ] Text remains readable

---

## Error Handling

### Network Errors (Simulate Later)
- [ ] Failed image generation shows error
- [ ] Failed 3D conversion shows error
- [ ] Retry options available

### User Input Errors
- [ ] Empty prompt shows disabled button
- [ ] Invalid file type shows alert
- [ ] Large file (>10MB) shows alert

---

## Performance Checks

### Initial Load
- [ ] Choice screen loads in <1s
- [ ] No layout shift
- [ ] Images load progressively

### 3D Model Preview
- [ ] Canvas renders smoothly
- [ ] OrbitControls respond instantly
- [ ] No frame drops during rotation

### Memory
- [ ] No memory leaks when navigating back/forth
- [ ] Images are properly cleaned up
- [ ] 3D models are disposed correctly

---

## Cross-Browser Testing

### Chrome/Edge
- [ ] All features work
- [ ] Gradients render correctly
- [ ] Animations smooth

### Firefox
- [ ] All features work
- [ ] Gradients render correctly
- [ ] File upload works

### Safari
- [ ] All features work
- [ ] Backdrop-filter works (or fallback)
- [ ] File upload works

---

## Keyboard Navigation

- [ ] Tab through all interactive elements
- [ ] Enter key submits forms
- [ ] Escape key closes modals (if any)
- [ ] Focus indicators visible

---

## Accessibility

### Screen Readers
- [ ] Button labels are clear
- [ ] Images have alt text
- [ ] Form inputs have labels

### Color Contrast
- [ ] Text readable on all backgrounds
- [ ] Buttons have sufficient contrast
- [ ] Focus indicators visible

---

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Make sure all imports are correct and files exist

### Issue: Canvas not rendering
**Solution:** Check Three.js and React Three Fiber are installed

### Issue: Mock images not loading
**Solution:** Check internet connection (using Picsum placeholder images)

### Issue: Styles not applying
**Solution:** Make sure CSS files are imported in components

---

## Next Steps After UI Testing

1. ✅ UI flow works end-to-end
2. ⏭️ Add Google Gemini API integration
3. ⏭️ Add 3D conversion API integration
4. ⏭️ Replace mock data with real generation
5. ⏭️ Add error boundaries
6. ⏭️ Add loading progress indicators
7. ⏭️ Add save/load project functionality

---

## Reporting Issues

When reporting issues, include:
1. Which path you were testing (Text/Image/Demo)
2. Which step failed
3. Browser and version
4. Screenshots/screen recording
5. Console errors (if any)

---

**Happy Testing! 🎉**
