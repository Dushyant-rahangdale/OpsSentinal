import os
import re

# List of files identified with react/jsx-no-comment-textnodes errors
files_to_fix = [
    "src/components/WeekSummary.tsx",
    "src/components/service/AddIntegrationGrid.tsx",
    "src/components/incident/IncidentHeader.tsx",
    "src/components/incident/TemplateSelector.tsx",
    "src/components/incident/detail/IncidentTags.tsx",
    "src/components/incident/detail/IncidentWatchers.tsx",
    "src/components/service/DeleteIntegrationButton.tsx",
    "src/components/settings/RoleMappingEditor.tsx",
    "src/components/settings/SettingsSearch.tsx",
    "src/components/StatusPageConfig.tsx",
    "src/components/TeamCard.tsx",
]

def fix_jsx_comments():
    for filepath in files_to_fix:
        full_path = os.path.join(os.getcwd(), filepath)
        if not os.path.exists(full_path):
            print(f"Skipping {filepath} (not found)")
            continue

        with open(full_path, 'r') as f:
            lines = f.readlines()

        new_lines = []
        for line in lines:
            # Look for lines that look like: <spaces>// eslint-disable
            # And wrap them in {/* ... */}
            # Pattern: matches whitespace start, then //, then content
            # But only if not already wrapped
            if re.match(r'^\s*//\s*eslint-disable', line):
                 # Check if we are likely inside JSX? Hard to tell for sure line-by-line, 
                 # but based on the error report, these specific files have this issue.
                 # We'll transform `// text` to `{/* text */}`
                 content = line.strip()
                 indent = line[:line.find('//')]
                 new_content = content.replace('//', '{/*') + ' */}'
                 new_lines.append(f"{indent}{new_content}\n")
                 print(f"Fixed comment in {filepath}")
            else:
                new_lines.append(line)
        
        with open(full_path, 'w') as f:
            f.writelines(new_lines)

if __name__ == "__main__":
    fix_jsx_comments()
