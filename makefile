DENO := deno

tests: clean fmt-check
	$(DENO) test --coverage=cov_profile *.test.ts

tests-cov: tests
	$(DENO) coverage cov_profile --lcov > cov_profile/cov.lcov

fmt:
	$(DENO) fmt *.ts

fmt-check:
	$(DENO) fmt *.ts --check

clean:
	rm -rf cov_profile
