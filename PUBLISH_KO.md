# 공식 확장 프로그램으로 등록하는 방법 (한글)

VS Code / Cursor는 **Visual Studio Code 마켓플레이스**를 사용합니다. 여기에 확장을 등록하면 누구나 **확장** 검색에서 찾아 설치할 수 있습니다.

---

## 1. 사전 준비

### 1.1 Microsoft 계정
- **Microsoft 계정**이 필요합니다. (Outlook.com, Hotmail 등으로 가입 가능)
- [https://account.microsoft.com](https://account.microsoft.com)에서 로그인할 수 있으면 됩니다.

### 1.2 게시자(Publisher) 만들기
1. [https://marketplace.visualstudio.com](https://marketplace.visualstudio.com) 에 접속합니다.
2. 오른쪽 위 **Sign in**으로 로그인합니다.
3. 로그인 후 **Publish extension** (또는 상단 메뉴의 게시 관련 항목)을 클릭합니다.
4. **Create Publisher**를 선택하고 **게시자 ID**를 만듭니다.
   - 예: `johndoe`, `mycompany` (영문, 소문자 등 규칙에 맞게)
   - 한 번 만들면 다른 확장에서도 같은 게시자로 등록할 수 있습니다.

### 1.3 .vsix 파일 준비
- **마켓플레이스 웹 업로드**용으로는 **OPC 형식** .vsix가 필요합니다. 터미널에서 이 프로젝트 폴더로 이동한 뒤:
  ```bash
  npm install
  npm run package:marketplace
  ```
- `raw-viewer-0.1.0.vsix` 파일이 생성되면 준비 완료입니다. (Node 18에서도 가능)
- (`npm run package`는 Cursor에서 "VSIX에서 설치"할 때 쓰는 단순 zip 형식이고, **마켓플레이스 업로드**에는 `package:marketplace`로 만든 파일을 쓰세요.)

---

## 2. package.json 수정

마켓플레이스에 올리기 **전에** `package.json`에서 다음을 본인 값으로 바꿉니다.

### 2.1 publisher
- **publisher**: 위에서 만든 **게시자 ID**를 넣습니다.
- 예: `"publisher": "johndoe"`  
  (지금은 `"your-publisher-id"` 로 되어 있으면 이를 실제 ID로 변경)

### 2.2 repository (선택이지만 권장)
- GitHub 등에 코드를 올려두었다면 **repository** URL을 넣어 둡니다.
- 예: `"repository": { "type": "git", "url": "https://github.com/사용자명/저장소이름" }`
- 넣어 두면 확장 페이지에 "Repository" 링크가 생겨 신뢰도에 도움이 됩니다.

수정 후 다시 `npm run package` 로 .vsix를 만들면 새 정보가 반영됩니다.

---

## 3. 등록 방법 (둘 중 하나 선택)

### 방법 A: 웹에서 .vsix 업로드 (가장 간단)

1. [https://marketplace.visualstudio.com](https://marketplace.visualstudio.com) 접속 후 로그인합니다.
2. **Publish extension** (또는 "New extension" / "Upload" 등) 메뉴를 클릭합니다.
3. **VSIX** 탭을 선택합니다.
4. **파일 선택** 또는 **Upload** 버튼으로 위에서 만든 **`raw-viewer-0.1.0.vsix`** 파일을 선택해 업로드합니다.
5. 확장 이름, 설명, 카테고리 등이 자동으로 채워지면 확인하고, 필요하면 수정한 뒤 **게시(Publish)** 또는 **Upload**를 클릭합니다.
6. 처리 후 마켓플레이스에 등록됩니다.

**이후 버전 올릴 때**: `package.json`의 `version`을 올리고 (예: `0.1.1`) 다시 `npm run package`로 새 .vsix를 만든 뒤, 같은 사이트에서 해당 확장 페이지로 가서 **새 .vsix를 업로드**하면 버전이 갱신됩니다.

---

### 방법 B: 터미널에서 vsce로 게시 (Node 20+ 필요)

1. **Personal Access Token (PAT) 만들기**
   - [https://dev.azure.com](https://dev.azure.com) 또는 마켓플레이스/Azure 관련 페이지에서 **Personal Access Tokens**로 들어갑니다.
   - 새 토큰을 만들 때 **Scope**에 **Publish** (또는 Marketplace publish) 권한이 포함되도록 선택합니다.
   - 만든 토큰을 복사해 둡니다. (다시 보여주지 않을 수 있음)

2. **vsce 로그인**
   - 터미널에서 **Node.js 20 이상**이 필요합니다.
   ```bash
   npx @vscode/vsce login (게시자ID)
   ```
   - 예: `npx @vscode/vsce login johndoe`
   - 프롬프트가 나오면 아까 만든 **PAT**를 붙여넣습니다.

3. **게시**
   - 이 확장 프로젝트 폴더에서:
   ```bash
   npm run package
   npx @vscode/vsce publish -p (PAT)
   ```
   - 또는 이미 로그인했다면:
   ```bash
   npx @vscode/vsce publish
   ```
   - 성공하면 마켓플레이스에 등록/업데이트됩니다.

---

## 4. 등록 후 확인 및 다른 사람이 쓰는 방법

- 마켓플레이스에서 확장 이름(예: **RAW 16-bit Viewer**)으로 검색해 페이지가 보이면 등록이 완료된 것입니다.
- **다른 사람**은 Cursor 또는 VS Code에서:
  1. **확장** 뷰(Ctrl+Shift+X)를 엽니다.
  2. 검색창에 **"RAW 16-bit Viewer"** 를 입력합니다.
  3. 목록에서 해당 확장을 선택하고 **설치(Install)** 버튼을 누르면 됩니다.

---

## 5. 요약 체크리스트

- [ ] Microsoft 계정으로 로그인
- [ ] marketplace.visualstudio.com 에서 **게시자(Publisher)** 생성
- [ ] `package.json` 에 **publisher**, **repository** 본인 값으로 수정
- [ ] `npm run package` 로 **.vsix** 파일 생성
- [ ] **방법 A**: 웹에서 .vsix 업로드 후 게시  
  **또는** **방법 B**: Node 20+ 에서 `vsce login` → `vsce publish`
- [ ] 마켓플레이스에서 검색해 등록 여부 확인

이 순서대로 하면 공식 확장으로 등록되어 다른 사람도 설치해서 사용할 수 있습니다.
