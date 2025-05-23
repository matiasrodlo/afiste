# Afiste - Tokenized Venture Capital Marketplace

## Overview
Afiste is a Fintech platform that revolutionizes the Venture Capital industry by tokenizing investment portfolios and creating a digital marketplace for VC assets. The platform aims to increase liquidity in the VC market while making it more accessible to a broader range of investors.

This project was developed during the second semester of Business Administration while participating in Jump Chile, a business idea acceleration program organized by the Catholic University of Chile through the UC Innovation Center. The project was selected among the top 20 out of more than 800 Latin American projects.

- **Pitch Video**: [Watch on YouTube](https://youtu.be/_oshvfDnEXo)
- **Venture Capital Marketplace Flow**: [Watch on YouTube](https://youtu.be/fx_i9NkrB8g)

## Problem Statement
Venture Capital, while being a major driver of technological innovation, faces several challenges:
- Low liquidity (10-12 year lock-in periods)
- High barriers to entry ($500,000 minimum investment)
- Significant risk factors
- Limited accessibility for smaller investors

## Solution
Afiste provides a digital platform that:
- Enables VC funds to tokenize their investment portfolios
- Creates a marketplace for trading tokenized VC assets
- Increases market liquidity
- Reduces entry barriers for investors
- Complies with asset issuance and market regulations

## Project Structure
```
afiste/
├── exchange/                # Cryptocurrency exchange platform
│   ├── backend/            # Exchange backend services
│   ├── frontend/           # Exchange frontend application
│   └── peatio/            # Peatio cryptocurrency exchange integration
├── web/                    # WordPress web platform
│   ├── wp-admin/          # WordPress admin interface
│   ├── wp-content/        # WordPress themes and plugins
│   └── wp-includes/       # WordPress core files
├── docs/                   # Project documentation
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

### Key Components
- **Exchange Platform**: Complete cryptocurrency exchange system with trading functionality
- **Web Platform**: WordPress-based website for user interface and content management
- **Documentation**: Project documentation and guides

## Technology Stack
- **Frontend**: React.js with modern UI components
- **Backend**: Node.js server
- **Exchange**: Peatio cryptocurrency exchange integration
- **Deployment**: Google Cloud Platform (app.yaml configurations)
- **CI/CD**: Bitbucket Pipelines

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git
- WordPress (for local development)

### Getting Started
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/afiste.git
   cd afiste
   ```

2. Set up the backend:
   ```bash
   cd Backend
   npm install
   npm start
   ```

3. Set up the frontend:
   ```bash
   cd Fronted
   npm install
   npm start
   ```

4. Configure WordPress (if needed):
   ```bash
   cd wordpress
   # Follow WordPress installation instructions
   ```

### Environment Configuration
1. Create `.env` files in both Backend and Frontend directories
2. Configure the following environment variables:
   - Database credentials
   - API keys
   - Service endpoints
   - Other configuration variables

### Version Control
The project uses Git for version control. A comprehensive `.gitignore` file is included to exclude:
- Dependencies (`node_modules/`)
- Environment files (`.env*`)
- Build outputs (`/build`, `/dist`)
- IDE configurations (`.vscode/`, `.idea/`)
- WordPress specific files
- System and temporary files

## UI Screenshots
### Trading Exchange Interface
[![Trading Exchange UI](https://github-production-user-asset-6210df.s3.amazonaws.com/52969662/282203775-735cbafd-0789-427c-8d73-7a7a8d4f6def.png)](https://youtu.be/fx_i9NkrB8g)

### Venture Capital Marketplace Flow
[![Marketplace Flow](https://github-production-user-asset-6210df.s3.amazonaws.com/52969662/280883110-b43b429f-7c4e-4836-9ce3-a0e36ca90ceb.png)](https://youtu.be/fx_i9NkrB8g)

