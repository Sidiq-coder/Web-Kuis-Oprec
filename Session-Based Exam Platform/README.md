# Computer Based Test (CBT) System

A comprehensive, session-based examination platform built with React, TypeScript, and Material-UI.

## 🎯 Features

### Participant Features
- **Biodata Registration** - Capture participant information without login
- **Theme Selection** - Single-choice lock mechanism (cannot change once selected)
- **CBT Exam Engine**
  - Real-time countdown timer
  - Auto-save with 3-second debounce
  - Auto-submit when time expires
  - Multiple choice and essay questions
  - Progress tracking
  - Question navigation
- **Project Module**
  - Theme selection for project
  - Case study display
  - File upload with validation (format & size)
  - Timer with auto-close
- **Session Management**
  - Automatic session cleanup after completion
  - No login required
  - Browser-based storage

### Admin Features
- **Dashboard** - Overview with statistics
- **Theme Management** - CRUD operations for exam themes
- **Question Management** - Create and manage multiple choice & essay questions
- **Participant Monitoring** - Real-time progress tracking
- **Essay Review** - Grade and provide feedback on essays
- **Project Review** - Download and evaluate project submissions
- **Export Data** - Generate reports

## 🚀 How to Use

### For Participants

1. **Start Exam**
   - Click "Start Exam" from home page
   - Fill in your biodata (name, email, phone, school, institution)
   - Click "Continue to Theme Selection"

2. **Select Theme**
   - Choose ONE exam theme (Web Dev, UI/UX, Data Science, etc.)
   - Confirm selection (cannot change after confirmation)

3. **Take Exam**
   - Answer multiple choice and essay questions
   - Your answers are auto-saved every 3 seconds
   - Timer countdown is displayed
   - Navigate between questions using the number buttons
   - Submit when complete or wait for auto-submit

4. **Select Project Theme**
   - Choose theme for your project (can be same or different)

5. **Complete Project**
   - Read the case study carefully
   - Work on your project on your local machine
   - Upload your project file (ZIP, PDF, etc.)
   - Submit before timer expires

6. **Completion**
   - Session automatically clears after 5 seconds
   - System ready for next participant

### For Admins

1. **Access Admin Dashboard**
   - Click "Admin Access" from home page

2. **Manage Themes**
   - Add, edit, or delete exam themes
   - Set icon, name, and description

3. **Manage Questions**
   - Select a theme
   - Add multiple choice or essay questions
   - Set question weight (points)
   - Define correct answers for multiple choice

4. **Monitor Participants**
   - View real-time participant progress
   - See who's taking exam or submitting projects
   - Track time remaining

5. **Review Essays**
   - Read essay submissions
   - Provide scores and feedback
   - Rate quality

6. **Review Projects**
   - Download project files
   - Evaluate and grade
   - Provide detailed feedback

## 📋 System Specifications

### Timer Settings
- **Exam Duration**: 60 minutes (configurable in backend settings)
- **Project Duration**: 120 minutes (configurable in backend settings)
- **Auto-save Delay**: 3 seconds (configurable in `sessionManager.ts`)

### File Upload Limits
- **Web Development**: ZIP/RAR/TAR.GZ up to 50MB
- **UI/UX Design**: FIG/SKETCH/XD/PDF/ZIP up to 100MB
- **Data Science**: IPYNB/PY/PDF/ZIP up to 30MB

### Themes Available
1. 🌐 Web Development
2. 🎨 UI/UX Design
3. 📊 Data Science
4. 🔒 Cybersecurity
5. 🌐 Networking

## 🔧 Technical Details

### Session Flow
```
Biodata → Theme Selection → Exam → Project Theme → Project → Complete → Clear Session
```

### Auto-Save Mechanism
- Debounced auto-save every 3 seconds
- Saves to localStorage
- Survives browser refresh
- Cleared after completion

### Timer Logic
- Backend timestamp validation
- Frontend countdown display
- Auto-submit when expired
- Warning when < 5 minutes (exam) or < 10 minutes (project)

### Data Storage (Current)
- **localStorage** for session data
- **sessionStorage** for temporary state
- Automatically cleared after completion

## 🎨 Design System

Built with Material-UI components following modern design principles:
- Clean, professional interface
- Responsive layout
- Clear visual hierarchy
- Accessible color contrast
- Intuitive navigation

## 📝 Configuration

Edit these files to customize:
- `src/app/utils/sessionManager.ts` - Session logic, auto-save settings
- `src/app/routes.tsx` - Add/modify routes

## 🔮 Future Enhancements with Supabase

Current localStorage implementation can be enhanced with Supabase:
- Persistent database storage
- Real file uploads to cloud storage
- Real-time participant monitoring
- Multi-device admin access
- Advanced analytics and reporting
- Email notifications
- Session recovery

## 🛠️ Development

This project uses:
- React 18.3.1
- TypeScript
- React Router 7.13.0
- Material-UI 7.3.5
- Tailwind CSS 4.1.12
- Vite 6.3.5

## 📄 License

This is a demonstration project for educational purposes.
