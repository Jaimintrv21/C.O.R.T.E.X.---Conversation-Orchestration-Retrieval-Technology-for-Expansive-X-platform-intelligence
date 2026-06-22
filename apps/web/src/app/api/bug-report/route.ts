import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, description, githubUser, category, difficulty } = await request.json();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const githubToken = process.env.GITHUB_TOKEN;
    
    // In order to create a real issue, we need an owner, repo, and a token.
    const owner = process.env.GITHUB_OWNER || 'Jaimintrv21';
    const repo = process.env.GITHUB_REPO || 'C.O.R.T.E.X.---Conversation-Orchestration-Retrieval-Technology-for-Expansive-X-platform-intelligence';

    const labels = ['user-reported'];
    if (category) {
      if (category === 'bug') labels.push('bug');
      else if (category === 'feature') labels.push('enhancement');
      else if (category === 'docs') labels.push('documentation');
      else if (category === 'optimization') labels.push('performance');
      else if (category === 'styling') labels.push('design');
      else if (category === 'security') labels.push('security');
    } else {
      labels.push('bug');
    }

    if (difficulty) {
      if (difficulty === 'easy') labels.push('difficulty:easy');
      else if (difficulty === 'medium') labels.push('difficulty:medium');
      else if (difficulty === 'hard') labels.push('difficulty:hard');
    }

    // If there is no token, simulate success so the UI doesn't break
    if (!githubToken) {
      console.warn("No GITHUB_TOKEN provided. Simulating issue creation.");
      return NextResponse.json({
        success: true,
        issueUrl: `https://github.com/${owner}/${repo}/issues/mock`,
        message: 'Bug reported successfully (simulated).'
      });
    }

    const issueBody = githubUser 
      ? `**Reported by GitHub User:** @${githubUser}\n\n${description}`
      : description;

    const issueTitle = githubUser
      ? `[${category?.toUpperCase() || 'BUG'}] ${title} (by @${githubUser})`
      : `[${category?.toUpperCase() || 'BUG'}] ${title}`;

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CORTEX-App'
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: labels
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create GitHub issue' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      issueUrl: data.html_url,
      message: 'Bug reported successfully.'
    });

  } catch (error) {
    console.error('Error reporting bug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
