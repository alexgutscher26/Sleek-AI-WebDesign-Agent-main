import { PageType } from "@/types/project"

export function generateFullAppPrompt(projectTitle: string, pages: PageType[]): string {
  const scaffoldingCommand = `bun create better-t-stack@latest my-better-t-app --frontend next native-uniwind --backend hono --runtime bun --api trpc --auth better-auth --payments none --database postgres --orm prisma --db-setup prisma-postgres --package-manager bun --git --web-deploy vercel --server-deploy vercel --install --addons skills turborepo --examples none`

  let prompt = `# Full-Stack App Implementation Prompt\n\n`
  prompt += `You are an expert full-stack developer. Your task is to build a fully working web application named "${projectTitle || "my-better-t-app"}" using a specific tech stack and the provided visual designs as blueprints.\n\n`

  prompt += `## Step 1: Scaffolding\n`
  prompt += `First, you must run the following command to scaffold the foundational architecture exactly as specified (unless the user explicitly suggests another tool or framework in their subsequent messages):\n\n`
  prompt += `\`\`\`bash\n${scaffoldingCommand}\n\`\`\`\n\n`

  prompt += `This will set up:\n`
  prompt += `- Frontend: Next.js with Tailwind CSS (native-uniwind)\n`
  prompt += `- Backend: Hono\n`
  prompt += `- API: tRPC\n`
  prompt += `- Auth: Better-Auth\n`
  prompt += `- Database: Postgres with Prisma ORM\n`
  prompt += `- Package Manager & Runtime: Bun\n`
  prompt += `- Monorepo: Turborepo\n\n`

  prompt += `## Step 2: Implementation\n`
  prompt += `Once the repository is scaffolded, implement the application logic, state management, backend API routes, and database integrations based on the UI blueprints provided below. You must translate the provided HTML and CSS into functional React components, set up the necessary Prisma schemas, configure the tRPC routers, and build the Hono backend logic to make the app fully functional within the generated architecture.\n\n`

  prompt += `### UI Blueprints\n`
  prompt += `Below are the generated visual designs for the application. Use them as the layout and styling reference for the frontend components.\n\n`

  pages.forEach((page, index) => {
    prompt += `#### Page ${index + 1}: ${page.name}\n\n`
    prompt += `**Root Styles (CSS Variables for Tailwind):**\n`
    prompt += `\`\`\`css\n${page.rootStyles}\n\`\`\`\n\n`
    prompt += `**HTML Layout & Content:**\n`
    prompt += `\`\`\`html\n${page.htmlContent}\n\`\`\`\n\n`
  })

  prompt += `## Instructions\n`
  prompt += `1. Review the requirements and UI blueprints.\n`
  prompt += `2. Run the scaffolding command.\n`
  prompt += `3. Define the database schema (Prisma) based on the implicit requirements of the UI (e.g., if there is a dashboard, figure out what data needs to be stored).\n`
  prompt += `4. Implement the tRPC routers in the Hono backend.\n`
  prompt += `5. Build the React components in the Next.js frontend using the provided HTML and CSS as reference.\n`
  prompt += `6. Connect the frontend to the backend using tRPC.\n`

  return prompt
}

export function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
