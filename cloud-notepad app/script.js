class CloudImageManager {
    constructor() {
        this.token = '';
        this.username = '';
        this.repo = '';
        this.folder = '';
        this.initElements();
        this.attachEventListeners();
    }

    initElements() {
        this.tokenInput = document.getElementById('gitToken');
        this.userInput = document.getElementById('gitUser');
        this.repoInput = document.getElementById('gitRepo');
        this.folderInput = document.getElementById('gitFolder');
        this.fileNameInput = document.getElementById('fileName');
        this.imageInput = document.getElementById('imageInput');
        this.fileTypeSelect = document.getElementById('fileType');
        this.addImageBtn = document.getElementById('addImageBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.imageList = document.getElementById('imageList');
        this.statusMessage = document.getElementById('statusMessage');
        this.imagePreview = document.getElementById('imagePreview');
        this.selectedFile = null;
    }

    attachEventListeners() {
        this.addImageBtn.addEventListener('click', () => this.addImage());
        this.refreshBtn.addEventListener('click', () => this.refreshImageList());
        this.imageInput.addEventListener('change', (e) => this.handleImageFileSelect(e));
    }

    handleImageFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.fileNameInput.value = file.name;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedFile = {
                name: file.name,
                content: e.target.result,
                base64: e.target.result.split(',')[1] || e.target.result
            };
            this.showStatus(`✓ File selected: ${file.name}`, 'success');
        };
        reader.readAsDataURL(file);
    }

    showStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
        setTimeout(() => {
            this.statusMessage.textContent = '';
            this.statusMessage.className = 'status-message';
        }, 5000);
    }

    validateCredentials() {
        this.token = this.tokenInput.value.trim();
        this.username = this.userInput.value.trim();
        this.repo = this.repoInput.value.trim();
        this.folder = this.folderInput.value.trim().replace(/\/$/, '');

        if (!this.token || !this.username || !this.repo) {
            this.showStatus('❌ Please fill in GitHub token, username, and repository name', 'error');
            return false;
        }
        return true;
    }

    async refreshImageList() {
        if (!this.validateCredentials()) return;

        this.showStatus('⏳ Loading images...', 'info');
        this.imageList.innerHTML = '<p class="loading">Loading...</p>';

        try {
            const path = this.folder ? this.folder : '';
            const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${path}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Repository or folder not found. Check your credentials and folder path.');
                }
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error('Invalid response format from GitHub API');
            }

            const images = data.filter(item => item.type === 'file');

            if (images.length === 0) {
                this.imageList.innerHTML = '<p class="placeholder">No images found in this folder</p>';
                this.showStatus('✓ No images found. Add one to get started!', 'success');
                return;
            }

            this.displayImageList(images);
            this.showStatus(`✓ Successfully loaded ${images.length} image(s)`, 'success');
        } catch (error) {
            this.imageList.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            this.showStatus(`❌ ${error.message}`, 'error');
        }
    }

    displayImageList(images) {
        this.imageList.innerHTML = '';

        images.forEach(image => {
            const div = document.createElement('div');
            div.className = 'image-item';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'image-info';
            infoDiv.innerHTML = `
                <h3>${image.name}</h3>
                <p class="file-path">${image.path}</p>
                <p class="file-size">${(image.size / 1024).toFixed(2)} KB</p>
            `;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'image-actions';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-small btn-info';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => this.viewImage(image.name, image.download_url));
            
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-small btn-warning';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => this.editImage(image.name, image.path));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => this.deleteImage(image.name, image.path));
            
            actionsDiv.appendChild(viewBtn);
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            
            div.appendChild(infoDiv);
            div.appendChild(actionsDiv);
            this.imageList.appendChild(div);
        });
    }

    async viewImage(fileName, downloadUrl) {
        try {
            this.showStatus('⏳ Loading image...', 'info');
            const response = await fetch(downloadUrl);

            if (!response.ok) throw new Error('Failed to fetch image');

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);

            this.imagePreview.innerHTML = `
                <div class="preview-container">
                    <img src="${imageUrl}" alt="${fileName}" class="preview-image">
                    <p class="preview-name">${fileName}</p>
                </div>
            `;
            this.showStatus(`✓ Image loaded: ${fileName}`, 'success');
        } catch (error) {
            this.showStatus(`❌ Error loading image: ${error.message}`, 'error');
        }
    }

    async editImage(fileName, filePath) {
        try {
            this.showStatus('⏳ Loading image for editing...', 'info');

            const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${filePath}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch file');

            const data = await response.json();
            const base64Content = data.content;

            this.fileNameInput.value = fileName;
            this.selectedFile = {
                name: fileName,
                base64: base64Content
            };
            this.showStatus(`✓ File loaded for editing: ${fileName}`, 'success');

            // Scroll to input section
            document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            this.showStatus(`❌ Error loading file for edit: ${error.message}`, 'error');
        }
    }

    async deleteImage(fileName, filePath) {
        if (!this.validateCredentials()) return;
        if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;

        try {
            this.showStatus('⏳ Deleting image...', 'info');

            const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${filePath}`;
            const getResponse = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!getResponse.ok) throw new Error('Failed to fetch file for deletion');

            const fileData = await getResponse.json();

            const deleteResponse = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete ${fileName}`,
                    sha: fileData.sha
                })
            });

            if (!deleteResponse.ok) throw new Error('GitHub API rejected the delete request');

            this.showStatus(`✓ Image deleted: ${fileName}`, 'success');
            await this.refreshImageList();
        } catch (error) {
            this.showStatus(`❌ Error deleting image: ${error.message}`, 'error');
        }
    }

    async addImage() {
        if (!this.validateCredentials()) return;

        const fileName = this.fileNameInput.value.trim();
        
        if (!fileName || !this.selectedFile) {
            this.showStatus('❌ Please select an image file and enter a filename', 'error');
            return;
        }

        this.showStatus('⏳ Uploading image...', 'info');

        try {
            const filePath = this.folder ? `${this.folder}/${fileName}` : fileName;
            const encodedContent = this.selectedFile.base64;

            const url = `https://api.github.com/repos/${this.username}/${this.repo}/contents/${filePath}`;

            let sha = null;
            try {
                const getResponse = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (getResponse.ok) {
                    const fileData = await getResponse.json();
                    sha = fileData.sha; 
                }
            } catch (e) {
            }

            const body = {
                message: `${sha ? 'Update' : 'Add'} ${fileName}`,
                content: encodedContent
            };

            if (sha) {
                body.sha = sha;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `GitHub API error: ${response.status}`);
            }

            this.showStatus(`✓ Image ${sha ? 'updated' : 'saved'} successfully: ${fileName}`, 'success');
            this.fileNameInput.value = '';
            this.imageInput.value = '';
            this.selectedFile = null;

            setTimeout(() => this.refreshImageList(), 500);
        } catch (error) {
            this.showStatus(`❌ Error uploading image: ${error.message}`, 'error');
        }
    }
}

let manager;
document.addEventListener('DOMContentLoaded', () => {
    manager = new CloudImageManager();
    console.log('Cloud Image Manager initialized. Ready to use!');
});
