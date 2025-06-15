# Mindful Meals Expert - AI-Based Diet Recommendation System

A web-based diet recommendation system that uses OCR for medical report scanning and AI for personalized diet plans.

## Features

- **User Authentication**
  - User and expert login/signup
  - Session-based authentication
  - Role-based access control

- **Health Assessment**
  - Comprehensive health profile collection
  - Medical report scanning with OCR
  - Dietary preferences and restrictions
  - Lifestyle information gathering

- **AI-Powered Diet Recommendations**
  - Personalized 7-day meal plans
  - Nutritional guidelines
  - Medical condition considerations
  - Customized portion sizes

- **Results Management**
  - Detailed meal plans
  - Nutritional information
  - Dietary guidelines
  - PDF export functionality
  - Plan sharing capabilities

## Tech Stack

- **Frontend**
  - HTML5
  - CSS3 with modern features
  - Vanilla JavaScript
  - Responsive design
  - Session Storage for data management

- **Backend**
  - Node.js
  - Express.js
  - Tesseract.js for OCR
  - OpenAI API for diet recommendations

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/mindful-meals-expert.git
   cd mindful-meals-expert
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     PORT=3000
     OPENAI_API_KEY=your_openai_api_key_here
     SESSION_SECRET=your_session_secret_here
     GROK_API_KEY=xai-qnjwQasYbatrFGwxvr0OZxckTi5b4Ms8YMah9vGQa8HuTZuOCkoHsxg6efcW8OapR4BqrAx5FGparWby
     ```

4. **Start the Server**
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

5. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
mindful-meals-expert/
├── public/
│   ├── index.html
│   ├── assessment.html
│   ├── results.html
│   ├── recipes.html
│   ├── styles/
│   │   ├── main.css
│   │   ├── assessment.css
│   │   └── results.css
│   └── js/
│       ├── main.js
│       ├── assessment.js
│       └── results.js
├── server.js
├── package.json
└── README.md
```

## Usage

1. **User Registration/Login**
   - Create an account or log in
   - Choose between user and expert roles

2. **Health Assessment**
   - Fill in personal information
   - Upload medical reports
   - Specify dietary preferences
   - Input lifestyle information

3. **Diet Plan Generation**
   - System processes health data
   - OCR extracts medical information
   - AI generates personalized recommendations

4. **View and Manage Results**
   - Review 7-day meal plan
   - Check nutritional guidelines
   - Download PDF version
   - Share plan with others

## Security Considerations

- All sensitive data is stored in session storage
- Medical reports are processed locally
- Passwords are hashed before storage
- API keys are secured in environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenAI for the GPT API
- Tesseract.js for OCR capabilities
- Contributors and maintainers
