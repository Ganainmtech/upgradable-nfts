module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2D2DF1',
        secondary: '#17CAC6',
        accent: '#001324',
        'primary-light': '#5858F0',
        'secondary-light': '#2ECFCC',
        'accent-light': '#334250',
        white: '#FFFFFF',
        'dark-bg': '#0F1A2D',  // Dark background color
        'dark-text': '#E0E0E0',  // Light text color for contrast
      },
      fontFamily: {
        aeonik: ['Aeonik', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'default': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'md': '0 6px 12px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        '300': '300ms',
      },
      animation: {
        ticker: 'ticker 15s linear infinite',
      },
    },
  },
  plugins: [],
}
