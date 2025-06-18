env:
	@creating virtual environment
	@conda create -n myenv python=3.11 -y
install:
	@echo "Install Python Dependencies"
	@pip install -r backend/requirements.txt