install:
	go build -o $(HOME)/go/bin/prover ./cmd/main.go

config:
	# create log files
	sudo mkdir -p /var/log/vwap-dynamic-fee-prover
	sudo touch /var/log/vwap-dynamic-fee-prover
	# copying over systemd config files
	sudo cp configs/*.service /etc/systemd/system
	sudo systemctl daemon-reload
	sudo systemctl enable vwap-dynamic-fee-prover

deploy: config install
	sudo systemctl restart vwap-dynamic-fee-prover

start:
	go run ./cmd/main.go